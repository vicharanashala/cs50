import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import dns from "node:dns";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const app = express();
const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET ?? "crowdfaq-development-secret-change-me-now";
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? process.env.CLIENT_URL ?? "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim());

const categories = [
  "Interview Prep",
  "Coding Rounds",
  "Resume & Portfolio",
  "Application Process",
  "Stipend & Pay",
  "Work Culture",
  "Offer & PPO",
  "Remote Internships",
  "Higher Studies",
  "Other",
];
const branches = ["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"];
const reportReasons = ["spam", "duplicate", "inappropriate", "other"];

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not configured. Using a development-only fallback secret.");
}
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((server) => server.trim()));
}

app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: "2mb" }));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    branch: { type: String, enum: branches },
    semester: { type: Number, min: 1, max: 8 },
    rollNumber: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 200 },
    profilePicture: String,
    reputation: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    answersGiven: { type: Number, default: 0 },
    acceptedAnswers: { type: Number, default: 0 },
    savedFaqs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Faq" }],
    isBanned: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    lastActive: Date,
  },
  { timestamps: true },
);

const faqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    category: { type: String, required: true, enum: categories },
    company: { type: String, trim: true },
    role: { type: String, trim: true },
    branch: { type: String, enum: branches },
    semester: { type: Number, min: 1, max: 8 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 25 }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    answerCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "answered", "closed"], default: "open" },
    isTrending: { type: Boolean, default: false },
    aiSummary: String,
    aiSummaryUpdatedAt: Date,
  },
  { timestamps: true },
);
faqSchema.index({ title: "text", description: "text", tags: "text" });
faqSchema.index({ category: 1, company: 1, role: 1 });
faqSchema.index({ createdAt: -1 });
faqSchema.index({ answerCount: -1 });
faqSchema.index({ upvotes: -1 });

const answerSchema = new mongoose.Schema(
  {
    faq: { type: mongoose.Schema.Types.ObjectId, ref: "Faq", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, default: false },
    body: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvotes: { type: Number, default: 0 },
    downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isAccepted: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        body: { type: String, trim: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
answerSchema.index({ faq: 1, isAccepted: -1, upvotes: -1, createdAt: -1 });

const reportSchema = new mongoose.Schema(
  {
    contentType: { type: String, enum: ["faq", "answer"], required: true },
    content: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "contentModel" },
    contentModel: { type: String, enum: ["Faq", "Answer"], required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: reportReasons, required: true },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const Faq = mongoose.model("Faq", faqSchema);
const Answer = mongoose.model("Answer", answerSchema);
const Report = mongoose.model("Report", reportSchema);
const userFields = "name email role branch semester rollNumber bio profilePicture reputation questionsAsked answersGiven acceptedAnswers savedFaqs isBanned createdAt";
const authorFields = "name profilePicture reputation";

function ok(response, data, status = 200) {
  return response.status(status).json({ success: true, data });
}
function fail(response, status, message, errors) {
  return response.status(status).json({ success: false, message, ...(errors && { errors }) });
}
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function parseToken(request) {
  const authorization = request.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
}
function signToken(user, expiresIn = process.env.JWT_EXPIRES_IN ?? "7d") {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, jwtSecret, { expiresIn });
}
function publicFaqQuery(query) {
  return query.populate("author", authorFields);
}
function publicAnswerQuery(query) {
  return query.populate("author", authorFields);
}
function objectId(value) {
  return mongoose.isValidObjectId(value);
}
function validationErrors(error) {
  return Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
}
function updateTrending(faq) {
  faq.isTrending = faq.upvotes > 5 || faq.answerCount > 3;
}
async function generateAiText(prompt, instructions) {
  const explicitModel = process.env.AI_MODEL;
  const legacyGeminiModel = process.env.OPENAI_MODEL?.startsWith("gemini-") ? process.env.OPENAI_MODEL : null;
  const useGemini = explicitModel ? explicitModel.startsWith("gemini-") : Boolean(process.env.GEMINI_API_KEY || legacyGeminiModel);
  const model = explicitModel ?? (useGemini ? process.env.GEMINI_MODEL || legacyGeminiModel || "gemini-2.5-flash" : process.env.OPENAI_MODEL || "gpt-5.4-mini");
  if (useGemini) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${instructions}\n\n${prompt}` }] }] }),
    });
    const result = await aiResponse.json();
    if (!aiResponse.ok) throw new Error("AI_REQUEST_FAILED");
    return result.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("AI_NOT_CONFIGURED");
  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions,
      input: prompt,
    }),
  });
  const result = await aiResponse.json();
  if (!aiResponse.ok) throw new Error("AI_REQUEST_FAILED");
  return result.output_text ?? result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}
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

async function authenticate(request, response, next) {
  try {
    const token = parseToken(request);
    if (!token) return fail(response, 401, "Please login to continue");
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.id);
    if (!user) return fail(response, 401, "Your session is no longer valid");
    if (user.isBanned) return fail(response, 403, "Your account has been banned");
    request.user = user;
    return next();
  } catch {
    return fail(response, 401, "Your session has expired. Please login again");
  }
}
async function optionalAuth(request, _response, next) {
  try {
    const token = parseToken(request);
    if (token) {
      const payload = jwt.verify(token, jwtSecret);
      request.user = await User.findById(payload.id);
    }
  } catch {
    request.user = null;
  }
  next();
}
function adminOnly(request, response, next) {
  return request.user.role === "admin" ? next() : fail(response, 403, "Administrator access required");
}

app.get("/api/health", (_request, response) => {
  ok(response, { status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});
app.post("/api/chatbot", async (request, response, next) => {
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

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const { name, email, password, confirmPassword, branch, semester, rollNumber } = request.body;
    const errors = {};
    if (!name || !/^[a-zA-Z ]{2,60}$/.test(name.trim())) errors.name = "Name must be 2-60 letters and spaces";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      errors.password = "Password must be at least 8 characters with a letter and a number";
    }
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (branch && !branches.includes(branch)) errors.branch = "Choose a valid branch";
    if (semester && (!Number.isInteger(Number(semester)) || Number(semester) < 1 || Number(semester) > 8)) {
      errors.semester = "Choose a semester from 1 to 8";
    }
    if (email && await User.exists({ email: email.toLowerCase() })) errors.email = "Email is already in use";
    if (Object.keys(errors).length) return fail(response, 400, "Please fix the highlighted fields", errors);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      branch: branch || undefined,
      semester: semester || undefined,
      rollNumber,
      lastActive: new Date(),
    });
    return ok(response, { token: signToken(user), user: await User.findById(user.id).select(userFields) }, 201);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const { email, password, rememberMe } = request.body;
    const user = await User.findOne({ email: String(email ?? "").toLowerCase() }).select("+password");
    if (!user) return fail(response, 404, "No account found with this email");
    if (user.isBanned) return fail(response, 403, "Your account has been banned");
    if (!await bcrypt.compare(String(password ?? ""), user.password)) {
      return fail(response, 401, "Incorrect email or password");
    }
    user.lastActive = new Date();
    await user.save();
    return ok(response, {
      token: signToken(user, rememberMe ? "30d" : process.env.JWT_EXPIRES_IN ?? "7d"),
      user: await User.findById(user.id).select(userFields),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/admin/login", async (request, response, next) => {
  try {
    const user = await User.findOne({ email: String(request.body.email ?? "").toLowerCase() }).select("+password");
    if (!user || !await bcrypt.compare(String(request.body.password ?? ""), user.password)) {
      return fail(response, 401, "Incorrect email or password");
    }
    if (user.role !== "admin") return fail(response, 403, "This page is for administrators only");
    return ok(response, { token: signToken(user), user: await User.findById(user.id).select(userFields) });
  } catch (error) {
    next(error);
  }
});
app.get("/api/auth/me", authenticate, async (request, response) => {
  ok(response, { user: await User.findById(request.user.id).select(userFields) });
});

app.get("/api/faqs/similar", async (request, response, next) => {
  try {
    const title = String(request.query.title ?? "").trim();
    if (title.length < 5) return ok(response, { faqs: [] });
    const words = title.split(/\s+/).filter((word) => word.length > 3).slice(0, 5);
    const filter = words.length ? { title: new RegExp(words.map(escapeRegex).join("|"), "i") } : { title: new RegExp(escapeRegex(title), "i") };
    const faqs = await publicFaqQuery(Faq.find(filter).select("title category author").limit(5)).lean();
    return ok(response, { faqs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/faqs", optionalAuth, async (request, response, next) => {
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

app.post("/api/faqs", authenticate, async (request, response, next) => {
  try {
    const tags = [...new Set((request.body.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
    if (tags.length > 5) return fail(response, 400, "Please use no more than 5 tags", { tags: "Use no more than 5 tags" });
    const faq = await Faq.create({ ...request.body, tags, author: request.user.id });
    await User.findByIdAndUpdate(request.user.id, { $inc: { questionsAsked: 1 } });
    return ok(response, { faq: await publicFaqQuery(Faq.findById(faq.id)).lean() }, 201);
  } catch (error) {
    next(error);
  }
});

app.get("/api/faqs/:id", optionalAuth, async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "FAQ not found");
    const faq = await publicFaqQuery(Faq.findById(request.params.id)).lean();
    if (!faq) return fail(response, 404, "FAQ not found");
    const saved = request.user ? request.user.savedFaqs.some((id) => id.equals(faq._id)) : false;
    const upvoted = request.user ? faq.upvotedBy.some((id) => id.equals(request.user.id)) : false;
    return ok(response, { faq, saved, upvoted });
  } catch (error) {
    next(error);
  }
});
app.patch("/api/faqs/:id/view", async (request, response, next) => {
  try {
    const faq = await Faq.findByIdAndUpdate(request.params.id, { $inc: { viewCount: 1 } }, { new: true });
    return faq ? ok(response, { viewCount: faq.viewCount }) : fail(response, 404, "FAQ not found");
  } catch (error) {
    next(error);
  }
});
app.post("/api/faqs/:id/upvote", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    const index = faq.upvotedBy.findIndex((id) => id.equals(request.user.id));
    if (index >= 0) faq.upvotedBy.splice(index, 1);
    else faq.upvotedBy.push(request.user.id);
    faq.upvotes = faq.upvotedBy.length;
    updateTrending(faq);
    await faq.save();
    return ok(response, { upvotes: faq.upvotes, upvoted: index < 0 });
  } catch (error) {
    next(error);
  }
});
app.post("/api/faqs/:id/save", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.exists({ _id: request.params.id });
    if (!faq) return fail(response, 404, "FAQ not found");
    const saved = request.user.savedFaqs.some((id) => id.equals(request.params.id));
    await User.findByIdAndUpdate(request.user.id, saved ? { $pull: { savedFaqs: request.params.id } } : { $addToSet: { savedFaqs: request.params.id } });
    return ok(response, { saved: !saved });
  } catch (error) {
    next(error);
  }
});
app.post("/api/faqs/:id/report", authenticate, async (request, response, next) => {
  try {
    if (!reportReasons.includes(request.body.reason)) return fail(response, 400, "Choose a valid report reason");
    if (!await Faq.exists({ _id: request.params.id })) return fail(response, 404, "FAQ not found");
    const report = await Report.create({ contentType: "faq", contentModel: "Faq", content: request.params.id, reporter: request.user.id, reason: request.body.reason });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});
app.post("/api/faqs/:id/generate-summary", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.id);
    if (!faq) return fail(response, 404, "FAQ not found");
    const answers = await Answer.find({ faq: faq.id }).sort({ isAccepted: -1, upvotes: -1 }).select("body").lean();
    if (answers.length < 3) return fail(response, 400, "At least 3 answers are needed to generate a summary");
    const summary = await generateAiText(
      `Question: ${faq.title}\n\nAnswers:\n${answers.map((answer, index) => `${index + 1}. ${answer.body}`).join("\n")}`,
      "Summarize the student community answers into a concise, practical response. Do not invent facts. Use plain text and at most 180 words.",
    );
    if (!summary) return fail(response, 502, "The AI summary service returned an empty response");
    faq.aiSummary = summary;
    faq.aiSummaryUpdatedAt = new Date();
    await faq.save();
    return ok(response, { summary, updatedAt: faq.aiSummaryUpdatedAt, answerCount: answers.length });
  } catch (error) {
    if (error.message === "AI_NOT_CONFIGURED") return fail(response, 503, "AI summaries are not configured yet");
    if (error.message === "AI_REQUEST_FAILED") return fail(response, 502, "The AI summary service could not complete the request");
    next(error);
  }
});

app.get("/api/faqs/:faqId/answers", async (request, response, next) => {
  try {
    const sort = request.query.sort ?? "upvoted";
    const sorts = { upvoted: { isAccepted: -1, upvotes: -1, createdAt: -1 }, newest: { isAccepted: -1, createdAt: -1 }, oldest: { isAccepted: -1, createdAt: 1 } };
    const answers = await publicAnswerQuery(Answer.find({ faq: request.params.faqId }).sort(sorts[sort] ?? sorts.upvoted)).lean();
    return ok(response, { answers });
  } catch (error) {
    next(error);
  }
});
app.post("/api/faqs/:faqId/answers", authenticate, async (request, response, next) => {
  try {
    const faq = await Faq.findById(request.params.faqId);
    if (!faq) return fail(response, 404, "FAQ not found");
    const answer = await Answer.create({ faq: faq.id, author: request.user.id, body: request.body.body, isAnonymous: Boolean(request.body.isAnonymous) });
    faq.answerCount += 1;
    if (faq.status === "open") faq.status = "answered";
    updateTrending(faq);
    await faq.save();
    await User.findByIdAndUpdate(request.user.id, { $inc: { answersGiven: 1, reputation: 10 } });
    return ok(response, { answer: await publicAnswerQuery(Answer.findById(answer.id)).lean(), answerCount: faq.answerCount }, 201);
  } catch (error) {
    next(error);
  }
});
app.post("/api/answers/:id/upvote", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
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
app.post("/api/answers/:id/downvote", authenticate, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
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
app.patch("/api/answers/:id/accept", authenticate, async (request, response, next) => {
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
    if (!answer.isAccepted) {
      answer.isAccepted = true;
      await answer.save();
      await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 25, acceptedAnswers: 1 } });
    }
    faq.status = "answered";
    await faq.save();
    return ok(response, { answer });
  } catch (error) {
    next(error);
  }
});
app.post("/api/answers/:id/report", authenticate, async (request, response, next) => {
  try {
    if (!reportReasons.includes(request.body.reason)) return fail(response, 400, "Choose a valid report reason");
    if (!await Answer.exists({ _id: request.params.id })) return fail(response, 404, "Answer not found");
    const report = await Report.create({ contentType: "answer", contentModel: "Answer", content: request.params.id, reporter: request.user.id, reason: request.body.reason });
    return ok(response, { report }, 201);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id", async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "User not found");
    const user = await User.findById(request.params.id).select(userFields).lean();
    if (!user) return fail(response, 404, "User not found");
    const [faqs, answers] = await Promise.all([
      Faq.find({ author: user._id }).select("title category status createdAt").sort({ createdAt: -1 }).limit(10).lean(),
      Answer.find({ author: user._id }).populate("faq", "title").select("body faq createdAt isAccepted").sort({ createdAt: -1 }).limit(10).lean(),
    ]);
    delete user.savedFaqs;
    return ok(response, { user, faqs, answers });
  } catch (error) {
    next(error);
  }
});
app.patch("/api/users/:id", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "You can only edit your own profile");
    const allowed = ["name", "branch", "semester", "bio", "profilePicture"];
    const changes = Object.fromEntries(allowed.filter((field) => request.body[field] !== undefined).map((field) => [field, request.body[field]]));
    const user = await User.findByIdAndUpdate(request.user.id, changes, { new: true, runValidators: true }).select(userFields);
    return ok(response, { user });
  } catch (error) {
    next(error);
  }
});
app.get("/api/users/:id/saved-faqs", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "You can only view your own bookmarks");
    const user = await User.findById(request.user.id).populate({ path: "savedFaqs", populate: { path: "author", select: authorFields } });
    return ok(response, { faqs: user.savedFaqs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/stats", authenticate, adminOnly, async (_request, response, next) => {
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
app.get("/api/admin/users", authenticate, adminOnly, async (request, response, next) => {
  try {
    const search = request.query.search ? new RegExp(escapeRegex(request.query.search), "i") : null;
    const filter = search ? { role: "student", $or: [{ name: search }, { email: search }] } : { role: "student" };
    return ok(response, { users: await User.find(filter).select(userFields).sort({ createdAt: -1 }).lean() });
  } catch (error) {
    next(error);
  }
});
app.patch("/api/admin/users/:id/ban", authenticate, adminOnly, async (request, response, next) => {
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
app.get("/api/admin/faqs", authenticate, adminOnly, async (request, response, next) => {
  try {
    const filter = request.query.search ? { title: new RegExp(escapeRegex(request.query.search), "i") } : {};
    return ok(response, { faqs: await publicFaqQuery(Faq.find(filter).sort({ createdAt: -1 })).lean() });
  } catch (error) {
    next(error);
  }
});
app.get("/api/admin/answers", authenticate, adminOnly, async (_request, response, next) => {
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
app.patch("/api/admin/answers/:id/verify", authenticate, adminOnly, async (request, response, next) => {
  try {
    const answer = await Answer.findById(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    answer.isVerified = !answer.isVerified;
    await answer.save();
    return ok(response, { answer });
  } catch (error) {
    next(error);
  }
});
app.delete("/api/admin/faqs/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    if (!await Faq.findByIdAndDelete(request.params.id)) return fail(response, 404, "FAQ not found");
    const answers = await Answer.find({ faq: request.params.id }).select("_id").lean();
    await Promise.all([
      Answer.deleteMany({ faq: request.params.id }),
      Report.deleteMany({ $or: [{ contentType: "faq", content: request.params.id }, { contentType: "answer", content: { $in: answers.map((answer) => answer._id) } }] }),
      User.updateMany({}, { $pull: { savedFaqs: request.params.id } }),
    ]);
    return ok(response, { deleted: true });
  } catch (error) {
    next(error);
  }
});
app.delete("/api/answers/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    const answer = await Answer.findByIdAndDelete(request.params.id);
    if (!answer) return fail(response, 404, "Answer not found");
    await Report.deleteMany({ contentType: "answer", content: answer.id });
    const faq = await Faq.findById(answer.faq);
    if (faq) {
      faq.answerCount = Math.max(0, faq.answerCount - 1);
      if (faq.answerCount === 0) faq.status = "open";
      await faq.save();
    }
    return ok(response, { deleted: true });
  } catch (error) {
    next(error);
  }
});
app.get("/api/admin/reports", authenticate, adminOnly, async (_request, response, next) => {
  try {
    return ok(response, { reports: await Report.find().populate("reporter", "name email").populate("content", "title description body").sort({ createdAt: -1 }).lean() });
  } catch (error) {
    next(error);
  }
});
app.patch("/api/admin/reports/:id", authenticate, adminOnly, async (request, response, next) => {
  try {
    const report = await Report.findByIdAndUpdate(request.params.id, { resolved: true }, { new: true });
    return report ? ok(response, { report }) : fail(response, 404, "Report not found");
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error.message);
  if (error.name === "ValidationError") return fail(response, 400, "Please fix the highlighted fields", validationErrors(error));
  if (error.code === 11000) return fail(response, 400, "That value is already in use");
  if (error.name === "CastError") return fail(response, 404, "Resource not found");
  return fail(response, 500, "Something went wrong. Please try again.");
});

async function seedAdmin() {
  if (!await User.exists({ role: "admin" })) {
    await User.create({ name: "Admin", email: "admin@crowdfaq.com", password: await bcrypt.hash("Admin@123", 10), role: "admin" });
    console.log("Seeded CrowdFAQ admin account");
  }
}
async function migrateLegacyFaqs() {
  const collection = mongoose.connection.collection("faqs");
  const legacyFaqs = await collection.find({ author: { $type: "string" } }).toArray();
  for (const faq of legacyFaqs) {
    const originalName = String(faq.author).trim();
    const name = /^[a-zA-Z ]{2,60}$/.test(originalName) ? originalName : "Legacy Student";
    const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "") || `student.${faq._id}`;
    let user = await User.findOne({ email: `legacy.${slug}@crowdfaq.local` });
    if (!user) {
      user = await User.create({
        name,
        email: `legacy.${slug}@crowdfaq.local`,
        password: await bcrypt.hash(`Legacy-${faq._id}`, 10),
      });
    }
    await collection.updateOne(
      { _id: faq._id },
      {
        $set: { author: user._id, upvotes: faq.upvoteCount ?? 0, viewCount: faq.views ?? 0 },
        $unset: { upvoteCount: "", views: "" },
      },
    );
  }
  if (legacyFaqs.length) console.log(`Migrated ${legacyFaqs.length} legacy FAQ record(s)`);
}
async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Add it to the root .env file.");
  await mongoose.connect(process.env.MONGODB_URI);
  await seedAdmin();
  await migrateLegacyFaqs();
  app.listen(port, () => console.log(`CrowdFAQ API listening at http://localhost:${port}`));
}
start().catch((error) => {
  console.error(`Failed to start CrowdFAQ API: ${error.message}`);
  process.exit(1);
});
