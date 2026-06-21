import { Router } from "express";
import Faq from "../models/Faq.js";
import Answer from "../models/Answer.js";
import AnswerHistory from "../models/AnswerHistory.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { ok, fail } from "../utils/response.js";
import { harmfulReason, requireReputation, updateTrending } from "../utils/helpers.js";
import { validate, answerSchema } from "../middleware/validator.js";
import { awardBadges } from "../services/badgeService.js";
import { notify, notifyMentions } from "../services/notificationService.js";
import { sendEmail } from "../services/emailService.js";
import { refreshFaqSummary } from "../services/aiService.js";

const router = Router();
const authorFields = "name reputation";

function publicAnswerQuery(query) {
  return query.populate("author", authorFields).populate("comments.author", authorFields);
}

router.get("/api/faqs/:faqId/answers", async (request, response, next) => {
  try {
    const sort = request.query.sort ?? "upvoted";
    const sorts = { upvoted: { isAccepted: -1, upvotes: -1, createdAt: -1 }, newest: { isAccepted: -1, createdAt: -1 }, oldest: { isAccepted: -1, createdAt: 1 } };
    const answers = await publicAnswerQuery(Answer.find({ faq: request.params.faqId }).sort(sorts[sort] ?? sorts.upvoted)).lean();
    return ok(response, { answers });
  } catch (error) {
    next(error);
  }
});

router.post("/api/faqs/:faqId/answers", authenticate, validate(answerSchema), async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.faqId);
    if (!faq) return fail(response, 404, "FAQ not found");
    if (faq.author.equals(request.user.id)) return fail(response, 403, "You cannot answer your own FAQ");
    if (harmfulReason(request.body.body)) return fail(response, 400, harmfulReason(request.body.body));
    if (await Answer.exists({ faq: faq.id, author: request.user.id })) return fail(response, 400, "You have already answered this question");
    const answer = await Answer.create({ faq: faq.id, author: request.user.id, body: request.body.body, isAnonymous: Boolean(request.body.isAnonymous) });
    faq.answerCount += 1;
    if (faq.status === "open") faq.status = "answered";
    updateTrending(faq);
    await faq.save();
    await User.findByIdAndUpdate(request.user.id, { $inc: { answersGiven: 1 } });
    await Promise.all([
      notify({
        recipient: faq.author,
        actor: request.user.id,
        type: "answer",
        message: `${request.user.name} answered your FAQ`,
        faq: faq.id,
        answer: answer.id,
      }),
      sendEmail(faq.author, "Your CrowdFAQ question received an answer", `${request.user.name} answered: ${faq.title}`),
      ...(faq.followers ?? []).map((follower) => notify({
        recipient: follower,
        actor: request.user.id,
        type: "followed-answer",
        message: `${request.user.name} answered a FAQ you follow`,
        faq: faq.id,
        answer: answer.id,
      })),
      notifyMentions(answer.body, { actor: request.user.id, faq: faq.id, answer: answer.id }),
    ]);
    const newBadges = await awardBadges(request.user.id);
    return ok(response, { answer: await publicAnswerQuery(Answer.findById(answer.id)).lean(), answerCount: faq.answerCount, newBadges }, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/upvote", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 25, "Upvoting");
    if (repError) return fail(response, 403, repError);
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    answer.upvotedBy ??= [];
    answer.downvotedBy ??= [];
    const upIndex = answer.upvotedBy.findIndex((id) => id.equals(request.user.id));
    const downIndex = answer.downvotedBy.findIndex((id) => id.equals(request.user.id));
    let reputationChange = 0;
    if (upIndex >= 0) {
      answer.upvotedBy.splice(upIndex, 1);
      reputationChange -= 5;
    } else {
      answer.upvotedBy.push(request.user.id);
      reputationChange += 5;
      if (downIndex >= 0) {
        answer.downvotedBy.splice(downIndex, 1);
        reputationChange += 2;
      }
    }
    answer.upvotes = answer.upvotedBy.length;
    answer.downvotes = answer.downvotedBy.length;
    await answer.save();
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: reputationChange } });
    return ok(response, { upvotes: answer.upvotes, downvotes: answer.downvotes, upvoted: upIndex < 0, downvoted: false });
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/downvote", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 50, "Downvoting");
    if (repError) return fail(response, 403, repError);
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    answer.upvotedBy ??= [];
    answer.downvotedBy ??= [];
    const downIndex = answer.downvotedBy.findIndex((id) => id.equals(request.user.id));
    const upIndex = answer.upvotedBy.findIndex((id) => id.equals(request.user.id));
    let reputationChange = 0;
    if (downIndex >= 0) {
      answer.downvotedBy.splice(downIndex, 1);
      reputationChange += 2;
    } else {
      answer.downvotedBy.push(request.user.id);
      reputationChange -= 2;
      if (upIndex >= 0) {
        answer.upvotedBy.splice(upIndex, 1);
        reputationChange -= 5;
      }
    }
    answer.upvotes = answer.upvotedBy.length;
    answer.downvotes = answer.downvotedBy.length;
    await answer.save();
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: reputationChange } });
    return ok(response, { upvotes: answer.upvotes, downvotes: answer.downvotes, upvoted: false, downvoted: downIndex < 0 });
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/comments", authenticate, async (request, response, next) => {
  try {
    const body = String(request.body.body ?? "").trim();
    if (body.length < 2 || body.length > 500) return fail(response, 400, "Comment must be between 2 and 500 characters");
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    const faq = await Faq.findById(answer.faq).select("author").lean();
    if (!faq) return fail(response, 404, "FAQ not found");
    if (faq.author.equals(request.user.id)) return fail(response, 403, "You cannot comment on your own FAQ");
    const repError = requireReputation(request.user, 10, "Commenting");
    if (repError) return fail(response, 403, repError);
    answer.comments.push({ author: request.user.id, body });
    await answer.save();
    await notifyMentions(body, { actor: request.user.id, faq: answer.faq, answer: answer.id });
    return ok(response, { answer: await publicAnswerQuery(Answer.findById(answer.id)).lean() }, 201);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/answers/:id/comments/:commentId", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    const comment = answer.comments.id(request.params.commentId);
    if (!comment) return fail(response, 404, "Comment not found");
    if (!comment.author || !comment.author.equals(request.user.id)) {
      return fail(response, 403, "You can only delete your own comment");
    }
    comment.deleteOne();
    await answer.save();
    return ok(response, { answer: await publicAnswerQuery(Answer.findById(answer.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/comments/:commentId/upvote", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    const comment = answer.comments.id(request.params.commentId);
    if (!comment) return fail(response, 404, "Comment not found");
    comment.upvotedBy ??= [];
    const index = comment.upvotedBy.findIndex((id) => id.equals(request.user.id));
    if (index >= 0) comment.upvotedBy.splice(index, 1);
    else comment.upvotedBy.push(request.user.id);
    comment.upvotes = comment.upvotedBy.length;
    await answer.save();
    const updated = await publicAnswerQuery(Answer.findById(answer.id)).lean();
    return ok(response, { answer: updated });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/answers/:id/accept", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    if (!answer.isVerified) return fail(response, 400, "This answer must be verified by an admin before it can be accepted");
    const faq = await Faq.findById(answer.faq);
    if (!faq.author.equals(request.user.id)) return fail(response, 403, "Only the question author can accept an answer");
    const previous = await Answer.findOne({ faq: faq.id, isAccepted: true });
    if (previous && !previous._id.equals(answer._id)) {
      previous.isAccepted = false;
      await previous.save();
      await User.findByIdAndUpdate(previous.author, { $inc: { reputation: -25, acceptedAnswers: -1 } });
    }
    let newlyAccepted = false;
    if (answer.isAccepted) {
      answer.isAccepted = false;
      await answer.save();
      await User.findByIdAndUpdate(answer.author, { $inc: { reputation: -25, acceptedAnswers: -1 } });
    } else {
      answer.isAccepted = true;
      await answer.save();
      await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 25, acceptedAnswers: 1 } });
      newlyAccepted = true;
    }
    faq.status = "answered";
    await faq.save();
    if (newlyAccepted) await Promise.all([
      notify({
        recipient: answer.author,
        actor: request.user.id,
        type: "accepted",
        message: `${request.user.name} accepted your answer as Best Answer`,
        faq: faq.id,
        answer: answer.id,
      }),
      sendEmail(answer.author, "Your CrowdFAQ answer was accepted", `Your answer to "${faq.title}" was marked as Best Answer.`),
    ]);
    return ok(response, { answer, accepted: answer.isAccepted });
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/report", authenticate, async (request, response, next) => {
  try {
    const reportReasons = ["spam", "duplicate", "inappropriate", "other"];
    if (!reportReasons.includes(request.body.reason)) return fail(response, 400, "Choose a valid report reason");
    if (!await Answer.exists({ _id: request.params.id })) return fail(response, 404, "Answer not found");
    const report = await Report.create({ contentType: "answer", contentModel: "Answer", content: request.params.id, reporter: request.user.id, reason: request.body.reason });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/api/answers/:id/flag", authenticate, async (request, response, next) => {
  try {
    const repError = requireReputation(request.user, 100, "Flagging");
    if (repError) return fail(response, 403, repError);
    if (!await Answer.exists({ _id: request.params.id })) return fail(response, 404, "Answer not found");
    const report = await Report.create({ contentType: "answer", contentModel: "Answer", content: request.params.id, reporter: request.user.id, reason: "duplicate" });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/answers/:id", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    const isAdmin = request.user.role === "admin";
    if (!isAdmin && !answer.author.equals(request.user.id)) return fail(response, 403, "You can only delete your own answer");
    if (!isAdmin && answer.isVerified) return fail(response, 403, "Verified answers require admin permission to delete");
    await answer.deleteOne();
    await Report.deleteMany({ contentType: "answer", content: answer.id });
    await Notification.deleteMany({ answer: answer.id });
    await User.findByIdAndUpdate(answer.author, {
      $inc: {
        answersGiven: -1,
        reputation: answer.isAccepted ? -35 : -10,
        ...(answer.isAccepted && { acceptedAnswers: -1 }),
      },
    });
    const faq = await Faq.findById(answer.faq);
    if (faq) {
      faq.answerCount = Math.max(0, faq.answerCount - 1);
      if (faq.answerCount === 0) faq.status = "open";
      await faq.save();
      if (answer.isVerified) {
        try {
          await refreshFaqSummary(faq.id);
        } catch (error) {
          console.error(`Automatic FAQ summary refresh failed after answer deletion: ${error.message}`);
        }
      }
    }
    return ok(response, { deleted: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/answers/:id", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    if (!answer.author.equals(request.user.id)) return fail(response, 403, "You can only edit your own answer");
    if (answer.isVerified) return fail(response, 403, "Verified answers require admin permission to edit");
    if (harmfulReason(request.body.body)) return fail(response, 400, harmfulReason(request.body.body));
    const prevBody = answer.body;
    if (request.body.body !== undefined) answer.body = request.body.body;
    if (request.body.isAnonymous !== undefined) answer.isAnonymous = Boolean(request.body.isAnonymous);
    await answer.save();
    await AnswerHistory.create({ answer: answer.id, editor: request.user.id, previousBody: prevBody });
    return ok(response, { answer: await publicAnswerQuery(Answer.findById(answer.id)).lean() });
  } catch (error) {
    next(error);
  }
});

router.get("/api/answers/:id/history", async (request, response, next) => {
  try {
    const history = await AnswerHistory.find({ answer: request.params.id }).populate("editor", "name").sort({ changedAt: -1 }).limit(20).lean();
    return ok(response, { history });
  } catch (error) {
    next(error);
  }
});

export default router;
