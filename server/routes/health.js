import { Router } from "express";
import mongoose from "mongoose";
import Faq from "../models/Faq.js";
import User from "../models/User.js";
import { ok } from "../utils/response.js";

const router = Router();

router.get("/api/health", (_request, response) => {
  ok(response, { status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

router.get("/api/landing-stats", async (_request, response, next) => {
  try {
    const [questionsAsked, internsHelped, companies, answeredFaqs, trendingTopics] = await Promise.all([
      Faq.countDocuments(),
      User.countDocuments({ role: "student" }),
      Faq.distinct("company", { company: { $exists: true, $nin: ["", null] } }),
      Faq.countDocuments({ answerCount: { $gt: 0 } }),
      Faq.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 },
      ]),
    ]);
    const companiesCovered = new Set(companies.map((company) => String(company).trim().toLowerCase()).filter(Boolean)).size;
    return ok(response, {
      stats: {
        questionsAsked,
        internsHelped,
        companiesCovered,
        answeredRate: questionsAsked ? Math.round((answeredFaqs / questionsAsked) * 100) : 0,
      },
      trendingTopics: trendingTopics.map((topic) => ({ category: topic._id, count: topic.count })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
