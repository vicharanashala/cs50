import { Router } from "express";
import Faq from "../models/Faq.js";
import Answer from "../models/Answer.js";
import { ok, fail } from "../utils/response.js";
import { escapeRegex } from "../utils/helpers.js";
import generateAiText from "../services/aiService.js";

const router = Router();

const chatStopWords = new Set([
  "about", "after", "also", "and", "are", "can", "could", "does", "for", "from", "have",
  "how", "internship", "into", "more", "need", "please", "should", "that", "the", "their",
  "then", "there", "this", "want", "what", "when", "where", "which", "with", "would", "your",
]);

function getChatTerms(message) {
  return [...new Set(String(message).toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((term) => term.length >= 3 && !chatStopWords.has(term))
    .slice(0, 10);
}

function faqRelevance(faq, terms) {
  const title = faq.title.toLowerCase();
  const description = faq.description.toLowerCase();
  const tags = faq.tags.join(" ").toLowerCase();
  const details = `${faq.company ?? ""} ${faq.role ?? ""}`.toLowerCase();
  return terms.reduce((score, term) => score
    + (title.includes(term) ? 6 : 0)
    + (tags.includes(term) ? 4 : 0)
    + (details.includes(term) ? 3 : 0)
    + (description.includes(term) ? 1 : 0), 0);
}

function noChatContext(response) {
  return ok(response, {
    answer: "I could not find a matching answered FAQ yet. Please post a new FAQ so the community can help.",
    sources: [],
    hasContext: false,
    suggestFaq: true,
  });
}

router.post("/api/chatbot", async (request, response, next) => {
  try {
    const message = String(request.body.message ?? "").trim();
    if (message.length < 3 || message.length > 500) {
      return fail(response, 400, "Please enter a question between 3 and 500 characters");
    }
    const terms = getChatTerms(message);
    if (!terms.length) return noChatContext(response);
    const pattern = new RegExp(terms.map(escapeRegex).join("|"), "i");
    const faqs = await Faq.find({
      status: "answered",
      answerCount: { $gt: 0 },
      $or: [{ title: pattern }, { description: pattern }, { tags: pattern }, { company: pattern }, { role: pattern }],
    }).select("title description category company role tags aiSummary").limit(12).lean();
    if (!faqs.length) return noChatContext(response);
    const rankedFaqs = faqs
      .map((faq) => ({ ...faq, relevance: faqRelevance(faq, terms) }))
      .filter((faq) => faq.relevance > 0)
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, 3);
    const answers = await Answer.find({ faq: { $in: rankedFaqs.map((faq) => faq._id) }, isVerified: true })
      .sort({ isAccepted: -1, upvotes: -1, createdAt: -1 })
      .select("faq body isAccepted upvotes")
      .lean();
    const sources = rankedFaqs
      .map((faq) => ({ ...faq, answers: answers.filter((answer) => answer.faq.equals(faq._id)).slice(0, 3) }))
      .filter((faq) => faq.answers.length);
    if (!sources.length) return noChatContext(response);
    const context = sources.map((faq, faqIndex) => [
      `FAQ ${faqIndex + 1}: ${faq.title}`,
      `Description: ${faq.description}`,
      ...faq.answers.map((answer, answerIndex) => `Verified answer ${answerIndex + 1}: ${answer.body}`),
    ].join("\n")).join("\n\n");
    let answer;
    try {
      answer = await generateAiText(
        `Student question: ${message}\n\nCrowdFAQ context:\n${context}`,
        "Answer the student's question using only the CrowdFAQ context. Keep the answer practical and concise. If the context is incomplete, say what is missing. Do not invent details or claim information outside the supplied FAQs.",
      );
    } catch (error) {
      if (!["AI_NOT_CONFIGURED", "AI_REQUEST_FAILED"].includes(error.message)) throw error;
      answer = `I found a relevant verified community answer: ${sources[0].answers[0].body}`;
    }
    return ok(response, {
      answer,
      hasContext: true,
      suggestFaq: false,
      sources: sources.map((faq) => ({ id: faq._id, title: faq.title, category: faq.category })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
