import "dotenv/config";
import cors from "cors";
import dns from "node:dns";
import express from "express";
import mongoose from "mongoose";

const app = express();
const port = Number(process.env.API_PORT ?? 3000);
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim());

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((server) => server.trim()));
}

app.use(cors({ origin: frontendOrigins }));
app.use(express.json({ limit: "1mb" }));

const faqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    category: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    role: { type: String, trim: true },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    author: { type: String, trim: true, default: "Anonymous" },
    status: { type: String, enum: ["open", "answered", "closed"], default: "open" },
    upvoteCount: { type: Number, default: 0 },
    answerCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

faqSchema.index({ title: "text", description: "text", tags: "text" });

const Faq = mongoose.model("Faq", faqSchema);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/faqs", async (request, response, next) => {
  try {
    const filter = {};
    const { search, category, company, status } = request.query;

    if (search) {
      const pattern = new RegExp(escapeRegex(String(search)), "i");
      filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }];
    }

    if (category) filter.category = category;
    if (company) filter.company = new RegExp(escapeRegex(String(company)), "i");
    if (status) filter.status = status;

    const faqs = await Faq.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    response.json({ faqs });
  } catch (error) {
    next(error);
  }
});

app.post("/api/faqs", async (request, response, next) => {
  try {
    const faq = await Faq.create(request.body);
    response.status(201).json({ faq });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error.name === "ValidationError") {
    return response.status(400).json({ message: "Invalid FAQ data", errors: error.errors });
  }

  console.error(error.message);
  return response.status(500).json({ message: "Something went wrong" });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to the root .env file.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`CrowdFAQ API listening at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(`Failed to start CrowdFAQ API: ${error.message}`);
  process.exit(1);
});
