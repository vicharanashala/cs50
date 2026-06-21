import { Router } from "express";
import Faq from "../models/Faq.js";
import FaqHistory from "../models/FaqHistory.js";
import Tag from "../models/Tag.js";
import Answer from "../models/Answer.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import { authenticate, optionalAuth, moderatorOrAdmin } from "../middleware/auth.js";
import { ok, fail } from "../utils/response.js";
import { escapeRegex, objectId, validationErrors, updateTrending, harmfulReason, requireReputation, createNotification } from "../utils/helpers.js";
import { validate, faqSchema } from "../middleware/validator.js";
import { awardBadges } from "../services/badgeService.js";
import { notify, notifyMentions } from "../services/notificationService.js";
import { sendEmail } from "../services/emailService.js";
import { refreshFaqSummary } from "../services/aiService.js";

const router = Router();
const authorFields = "name reputation";

function publicFaqQuery(query) {
  return query.populate("author", authorFields);
}

router.get("/api/faqs/similar", async (request, response, next) => {
  try {
    const title = String(request.query.title ?? "").trim();
    if (title.length < 5) return ok(response, { faqs: [] });
    const words = title.split(/\s+/).filter((word) => word.length > 3).slice(0, 5);
    if (!words.length) return ok(response, { faqs: [] });
    const pattern = new RegExp(words.map(escapeRegex).join("|"), "i");
    const candidates = await Faq.find({ $or: [{ title: pattern }, { description: pattern }, { tags: pattern }] })
      .select("title description tags category author")
      .populate("author", authorFields)
      .lean();
    const lowerWords = words.map((word) => word.toLowerCase());
    const scored = candidates
      .map((faq) => {
        const text = `${faq.title} ${faq.description} ${faq.tags.join(" ")}`.toLowerCase();
        const matchedAll = lowerWords.every((word) => text.includes(word));
        const score = lowerWords.reduce((sum, word) => sum + (faq.title.toLowerCase().includes(word) ? 6 : 0)
          + (faq.tags.join(" ").toLowerCase().includes(word) ? 4 : 0)
          + (faq.description.toLowerCase().includes(word) ? 1 : 0), 0);
        return { ...faq, score, matchedAll };
      })
      .filter((faq) => faq.matchedAll)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map(({ score, matchedAll, ...rest }) => rest);
    return ok(response, { faqs: scored });
  } catch (error) {
    next(error);
  }
});

router.get("/api/faqs", optionalAuth, async (request, response, next) => {
  try {
    const { search, category, company, role, status, sort = "latest" } = request.query;
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10));
    const filter = {};
    if (search) {
      const pattern = new RegExp(
        String(search).trim().split(/\s+/).filter(Boolean).map(escapeRegex).join("|"),
        "i",
      );
      filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }];
    }
    if (category) filter.category = { $in: String(category).split(",").filter(Boolean) };
    if (company) filter.company = new RegExp(escapeRegex(company), "i");
    if (role) filter.role = new RegExp(escapeRegex(role), "i");
    if (status && status !== "all") filter.status = status;
    if (sort === "unanswered") filter.answerCount = 0;
    const sorts = { latest: { createdAt: -1 }, answered: { answerCount: -1, createdAt: -1 }, upvoted: { upvotes: -1, createdAt: -1 }, unanswered: { createdAt: -1 } };
    const [faqs, total] = await Promise.all([
      publicFaqQuery(Faq.find(filter).sort(sorts[sort] ?? sorts.latest).skip((page - 1) * limit).limit(limit)).lean(),
      Faq.countDocuments(filter),
    ]);
    return ok(response, { faqs, total, page, hasMore: page * limit < total });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs", authenticate, validate(faqSchema), async (request, response, next) => {
  try {
    if (harmfulReason(request.body.title) || harmfulReason(request.body.description)) return fail(response, 400, harmfulReason(request.body.title) ?? harmfulReason(request.body.description));
    const tags = [...new Set((request.body.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
    const faq = await Faq.create({ ...request.body, tags, author: request.user.id, followers: [request.user.id] });
    await Promise.all([
      User.findByIdAndUpdate(request.user.id, { $inc: { questionsAsked: 1 } }),
      ...tags.map((tag) => Tag.updateOne({ name: tag }, { $inc: { usageCount: 1 }, $setOnInsert: { name: tag } }, { upsert: true })),
    ]);
    const newBadges = await awardBadges(request.user.id);
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean(), newBadges }, 201);
  } catch (error) {
    next(error);
  }
});

router.get("/api/faqs/:id", optionalAuth, async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "FAQ not found");
    const faq = await publicFaqQuery(Faq.findById(request.params.id)).lean();
    if (!faq) return fail(response, 404, "FAQ not found");
    const saved = request.user ? (request.user.savedFaqs ?? []).some((id) => id.equals(faq._id)) : false;
    const upvoted = request.user ? (faq.upvotedBy ?? []).some((id) => id.equals(request.user.id)) : false;
    const downvoted = request.user ? (faq.downvotedBy ?? []).some((id) => id.equals(request.user.id)) : false;
    const followed = request.user ? (faq.followers ?? []).some((id) => id.equals(request.user.id)) : false;
    return ok(response, { faq, saved, upvoted, downvoted, followed });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/faqs/:id/view", optionalAuth, async (request, response, next) => {
  try {
    if (request.user) {
      const faq = await Faq.findOneAndUpdate(
        { _id: request.params.id, viewedBy: { $ne: request.user.id } },
        { $push: { viewedBy: request.user.id }, $inc: { viewCount: 1 } },
        { new: true },
      );
      return ok(response, { viewCount: faq ? faq.viewCount : (await Faq.findById(request.params.id).select("viewCount")).viewCount });
    }
    const existing = await Faq.findByIdAndUpdate(request.params.id, { $inc: { viewCount: 1 } }, { new: true });
    return existing ? ok(response, { viewCount: existing.viewCount }) : fail(response, 404, "FAQ not found");
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/upvote", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 25, "Upvoting");
    if (repError) return fail(response, 403, repError);
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    faq.upvotedBy ??= [];
    faq.downvotedBy ??= [];
    const upIndex = faq.upvotedBy.findIndex((id) => id.equals(request.user.id));
    const downIndex = faq.downvotedBy.findIndex((id) => id.equals(request.user.id));
    if (upIndex >= 0) faq.upvotedBy.splice(upIndex, 1);
    else {
      faq.upvotedBy.push(request.user.id);
      if (downIndex >= 0) faq.downvotedBy.splice(downIndex, 1);
    }
    faq.upvotes = faq.upvotedBy.length;
    faq.downvotes = faq.downvotedBy.length;
    updateTrending(faq);
    await faq.save();
    return ok(response, { upvotes: faq.upvotes, downvotes: faq.downvotes, upvoted: upIndex < 0, downvoted: false });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/downvote", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 50, "Downvoting");
    if (repError) return fail(response, 403, repError);
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    faq.upvotedBy ??= [];
    faq.downvotedBy ??= [];
    const downIndex = faq.downvotedBy.findIndex((id) => id.equals(request.user.id));
    const upIndex = faq.upvotedBy.findIndex((id) => id.equals(request.user.id));
    if (downIndex >= 0) faq.downvotedBy.splice(downIndex, 1);
    else {
      faq.downvotedBy.push(request.user.id);
      if (upIndex >= 0) faq.upvotedBy.splice(upIndex, 1);
    }
    faq.upvotes = faq.upvotedBy.length;
    faq.downvotes = faq.downvotedBy.length;
    updateTrending(faq);
    await faq.save();
    return ok(response, { upvotes: faq.upvotes, downvotes: faq.downvotes, upvoted: false, downvoted: downIndex < 0 });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/save", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.exists({ _id: request.params.id });
    if (!faq) return fail(response, 404, "FAQ not found");
    const saved = (request.user.savedFaqs ?? []).some((id) => id.equals(request.params.id));
    await User.findByIdAndUpdate(request.user.id, saved ? { $pull: { savedFaqs: request.params.id } } : { $addToSet: { savedFaqs: request.params.id } });
    return ok(response, { saved: !saved });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/follow", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    if (faq.author.equals(request.user.id)) return fail(response, 400, "You cannot follow your own question");
    faq.followers ??= [];
    const followed = faq.followers.some((id) => id.equals(request.user.id));
    if (followed) {
      faq.followers.pull(request.user.id);
      await User.findByIdAndUpdate(request.user.id, { $pull: { followedFaqs: faq.id } });
    } else {
      faq.followers.addToSet(request.user.id);
      await User.findByIdAndUpdate(request.user.id, { $addToSet: { followedFaqs: faq.id } });
    }
    await faq.save();
    return ok(response, { followed: !followed });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/report", authenticate, async (request, response, next) => {
  try {
    const reportReasons = ["spam", "duplicate", "inappropriate", "other"];
    if (!reportReasons.includes(request.body.reason)) return fail(response, 400, "Choose a valid report reason");
    if (!await Faq.exists({ _id: request.params.id })) return fail(response, 404, "FAQ not found");
    const report = await Report.create({ contentType: "faq", contentModel: "Faq", content: request.params.id, reporter: request.user.id, reason: request.body.reason });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/flag", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 100, "Flagging");
    if (repError) return fail(response, 403, repError);
    if (!await Faq.exists({ _id: request.params.id })) return fail(response, 404, "FAQ not found");
    const report = await Report.create({ contentType: "faq", contentModel: "Faq", content: request.params.id, reporter: request.user.id, reason: "duplicate" });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/close", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    if (faq.status === "closed") return fail(response, 400, "FAQ is already closed");
    const closeReasons = ["duplicate", "off-topic", "resolved", "other"];
    faq.closeReason = request.body.reason && closeReasons.includes(request.body.reason) ? request.body.reason : "other";
    if (faq.closeReason === "duplicate" && request.body.duplicateOf) {
      faq.duplicateOf = request.body.duplicateOf;
    }
    faq.status = "closed";
    await faq.save();
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/reopen", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    if (faq.status !== "closed") return fail(response, 400, "Only closed FAQs can be reopened");
    faq.status = faq.answerCount > 0 ? "answered" : "open";
    await faq.save();
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.put("/api/faqs/:id/merge/:sourceId", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const [target, source] = await Promise.all([
      Faq.findById(request.params.id),
      Faq.findById(request.params.sourceId),
    ]);
    if (!target) return fail(response, 404, "Target FAQ not found");
    if (!source) return fail(response, 404, "Source FAQ not found");
    if (source.status !== "closed" || source.closeReason !== "duplicate") {
      return fail(response, 400, "Only closed-as-duplicate FAQs can be merged");
    }
    await Answer.updateMany({ faq: source.id }, { faq: target.id });
    target.answerCount += source.answerCount;
    target.followers = [...new Set([...target.followers.map((f) => f.toString()), ...source.followers.map((f) => f.toString())])];
    await target.save();
    await source.deleteOne();
    return ok(response, { faq: await publicFaqQuery(Faq.findById(target.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.delete("/api/faqs/:id", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    if (!faq.author.equals(request.user.id)) return fail(response, 403, "You can only delete your own FAQ");
    if (faq.answerCount > 0 || await Answer.exists({ faq: faq.id })) {
      return fail(response, 403, "Answered FAQs require admin permission to delete");
    }
    await faq.deleteOne();
    await Promise.all([
      Report.deleteMany({ contentType: "faq", content: faq.id }),
      Notification.deleteMany({ faq: faq.id }),
      User.updateMany({}, { $pull: { savedFaqs: faq.id, followedFaqs: faq.id } }),
      User.findByIdAndUpdate(faq.author, { $inc: { questionsAsked: -1 } }),
      faq.tags.length
        ? Tag.bulkWrite(faq.tags.map((tag) => ({
            updateOne: { filter: { name: tag }, update: { $inc: { usageCount: -1 } } },
          })))
        : Promise.resolve(),
    ]);
    return ok(response, { deleted: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/faqs/:id", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    const isMod = ["moderator", "admin"].includes(request.user.role);
    if (!faq.author.equals(request.user.id) && !isMod) return fail(response, 403, "You can only edit your own FAQ");
    if (harmfulReason(request.body.title) || harmfulReason(request.body.description)) return fail(response, 400, harmfulReason(request.body.title) ?? harmfulReason(request.body.description));
    const allowed = ["title", "description", "category", "company", "role", "branch", "semester", "isAnonymous"];
    for (const field of allowed) {
      if (request.body[field] !== undefined) faq[field] = request.body[field];
    }
    const prevTitle = faq.title, prevDescription = faq.description, prevCategory = faq.category, prevCompany = faq.company, prevRole = faq.role, prevTags = [...faq.tags];
    if (request.body.tags) {
      const tags = [...new Set(request.body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
      if (tags.length > 5) return fail(response, 400, "Please use no more than 5 tags");
      faq.tags = tags;
    }
    await faq.save();
    await FaqHistory.create({ faq: faq.id, editor: request.user.id, previousTitle: prevTitle, previousDescription: prevDescription, previousCategory: prevCategory, previousCompany: prevCompany, previousRole: prevRole, previousTags: prevTags });
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.get("/api/faqs/:id/history", async (request, response, next) => {
  try {
    const history = await FaqHistory.find({ faq: request.params.id }).populate("editor", "name").sort({ changedAt: -1 }).limit(20).lean();
    return ok(response, { history });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:id/generate-summary", authenticate, async (request, response, next) => {
  try {
    const summary = await refreshFaqSummary(request.params.id);
    if (!summary.verifiedAnswerCount) return fail(response, 400, "At least one verified answer is needed to generate a summary");
    return ok(response, summary);
  } catch (error) {
    if (error.message === "FAQ_NOT_FOUND") return fail(response, 404, "FAQ not found");
    if (error.message === "AI_NOT_CONFIGURED") return fail(response, 503, "AI summaries are not configured yet");
    if (["AI_REQUEST_FAILED", "AI_EMPTY_RESPONSE"].includes(error.message)) return fail(response, 502, "The AI summary service could not complete the request");
    next(error);
  }
});

export default router;
