import { Router } from "express";
import User, { userFields, authorFields } from "../models/User.js";
import Faq from "../models/Faq.js";
import Answer from "../models/Answer.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import { authenticate, adminOnly, moderatorOrAdmin } from "../middleware/auth.js";
import { ok, fail } from "../utils/response.js";
import { escapeRegex } from "../utils/helpers.js";
import { refreshFaqSummary } from "../services/aiService.js";

const router = Router();

function publicFaqQuery(query) {
  return query.populate("author", authorFields);
}

router.get("/api/admin/stats", authenticate, adminOnly, async (_request, response, next) => {
  try {
    const [users, faqs, answers, openFaqs, answeredFaqs, reportsPending] = await Promise.all([
      User.countDocuments({ role: "student" }), Faq.countDocuments(), Answer.countDocuments(),
      Faq.countDocuments({ status: "open" }), Faq.countDocuments({ status: "answered" }), Report.countDocuments({ resolved: false }),
    ]);
    return ok(response, { users, faqs, answers, openFaqs, answeredFaqs, reportsPending });
  } catch (error) {
    next(error);
  }
});

router.get("/api/admin/users", authenticate, adminOnly, async (request, response, next) => {
  try {
    const search = request.query.search ? new RegExp(escapeRegex(request.query.search), "i") : null;
    const filter = search ? { role: "student", $or: [{ name: search }, { email: search }] } : { role: "student" };
    return ok(response, { users: await User.find(filter).select(userFields).sort({ createdAt: -1 }).lean() });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/admin/users/:id/ban", authenticate, adminOnly, async (request, response, next) => {
  try {
    const user = await User.findById(request.params.id);
    if (!user) return fail(response, 404, "User not found");
    user.isBanned = !user.isBanned;
    await user.save();
    return ok(response, { user });
  } catch (error) {
    next(error);
  }
});

router.delete("/api/admin/users/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    const user = await User.findById(request.params.id);
    if (!user) return fail(response, 404, "User not found");
    if (user.role === "admin") return fail(response, 403, "Cannot delete an admin account");
    const faqs = await Faq.find({ author: user._id }).select("_id").lean();
    const faqIds = faqs.map((f) => f._id);
    const answers = await Answer.find({ author: user._id }).select("_id").lean();
    const answerIds = answers.map((a) => a._id);
    await Promise.all([
      Answer.deleteMany({ author: user._id }),
      Faq.deleteMany({ author: user._id }),
      Report.deleteMany({ $or: [{ reporter: user._id }, { content: { $in: [...faqIds, ...answerIds] } }] }),
      Notification.deleteMany({ $or: [{ recipient: user._id }, { actor: user._id }] }),
      User.updateMany({}, { $pull: { savedFaqs: { $in: faqIds }, followers: user._id, following: user._id } }),
      user.deleteOne(),
    ]);
    return ok(response, { message: "User and all associated content deleted" });
  } catch (error) {
    next(error);
  }
});

router.get("/api/admin/faqs", authenticate, adminOnly, async (request, response, next) => {
  try {
    const filter = request.query.search ? { title: new RegExp(escapeRegex(request.query.search), "i") } : {};
    return ok(response, { faqs: await publicFaqQuery(Faq.find(filter).sort({ createdAt: -1 })).lean() });
  } catch (error) {
    next(error);
  }
});

router.get("/api/admin/answers", authenticate, adminOnly, async (_request, response, next) => {
  try {
    return ok(response, {
      answers: await Answer.find()
        .populate("author", authorFields)
        .populate("faq", "title")
        .sort({ createdAt: -1 })
        .lean(),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/admin/answers/:id/verify", authenticate, adminOnly, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    answer.isVerified = !answer.isVerified;
    await answer.save();
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: answer.isVerified ? 10 : -10 } });
    let summaryRefresh;
    try {
      summaryRefresh = { updated: true, ...await refreshFaqSummary(answer.faq) };
    } catch (error) {
      console.error(`Automatic FAQ summary refresh failed: ${error.message}`);
      summaryRefresh = { updated: false };
    }
    return ok(response, { answer, summaryRefresh });
  } catch (error) {
    next(error);
  }
});

router.post("/api/admin/answers/:id/convert-to-comment", authenticate, adminOnly, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    const faq = await Faq.findById(answer.faq);
    if (!faq) return fail(response, 404, "FAQ not found");
    faq.answerCount = Math.max(0, faq.answerCount - 1);
    if (faq.answerCount === 0 && faq.status === "answered") faq.status = "open";
    await faq.save();
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: -5, answersGiven: -1 } });
    await answer.deleteOne();
    return ok(response, { message: "Answer converted to comment" });
  } catch (error) {
    next(error);
  }
});

router.delete("/api/admin/faqs/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    if (!await Faq.findByIdAndDelete(request.params.id)) return fail(response, 404, "FAQ not found");
    const answers = await Answer.find({ faq: request.params.id }).select("_id").lean();
    await Promise.all([
      Answer.deleteMany({ faq: request.params.id }),
      Report.deleteMany({ $or: [{ contentType: "faq", content: request.params.id }, { contentType: "answer", content: { $in: answers.map((answer) => answer._id) } }] }),
      Notification.deleteMany({ faq: request.params.id }),
      User.updateMany({}, { $pull: { savedFaqs: request.params.id } }),
    ]);
    return ok(response, { deleted: true });
  } catch (error) {
    next(error);
  }
});

async function fetchReports() {
  return Report.find().populate("reporter", "name email").populate("content", "title description body").sort({ createdAt: -1 }).lean();
}

router.get("/api/moderator/reports", authenticate, moderatorOrAdmin, async (_request, response, next) => {
  try {
    return ok(response, { reports: await fetchReports() });
  } catch (error) {
    next(error);
  }
});

router.get("/api/admin/reports", authenticate, adminOnly, async (_request, response, next) => {
  try {
    return ok(response, { reports: await fetchReports() });
  } catch (error) {
    next(error);
  }
});

async function resolveReport(id) {
  return Report.findByIdAndUpdate(id, { resolved: true }, { new: true });
}

router.patch("/api/moderator/reports/:id", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const report = await resolveReport(request.params.id);
    return report ? ok(response, { report }) : fail(response, 404, "Report not found");
  } catch (error) {
    next(error);
  }
});

router.patch("/api/admin/reports/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    const report = await resolveReport(request.params.id);
    return report ? ok(response, { report }) : fail(response, 404, "Report not found");
  } catch (error) {
    next(error);
  }
});

router.post("/api/moderator/reports/:id/escalate", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const report = await Report.findById(request.params.id);
    if (!report) return fail(response, 404, "Report not found");
    if (report.resolved) return fail(response, 400, "This report has already been resolved");
    if (report.escalated) return fail(response, 400, "This report has already been escalated");
    report.escalated = true;
    await report.save();
    return ok(response, { report });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/admin/faqs/:id/feature", authenticate, moderatorOrAdmin, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    faq.isFeatured = !faq.isFeatured;
    await faq.save();
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean() });
  } catch (error) {
    next(error);
  }
});

export default router;
