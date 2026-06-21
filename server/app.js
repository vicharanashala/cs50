import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";
import { validateEnv } from "./config/env.js";
import { authLimiter, apiLimiter } from "./middleware/rateLimiter.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import faqsRouter from "./routes/faqs.js";
import answersRouter from "./routes/answers.js";
import usersRouter from "./routes/users.js";
import notificationsRouter from "./routes/notifications.js";
import chatbotRouter from "./routes/chatbot.js";
import tagsRouter from "./routes/tags.js";
import adminRouter from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

validateEnv();

const app = express();

app.use(helmet());
app.use(cors());
app.use(mongoSanitize());
app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use(healthRouter);
app.use(authRouter);
app.use(faqsRouter);
app.use(answersRouter);
app.use(usersRouter);
app.use(notificationsRouter);
app.use(chatbotRouter);
app.use(tagsRouter);
app.use(adminRouter);

app.use(express.static(path.resolve(__dirname, "..", "dist")));
app.get("*", (_request, response) => {
  response.sendFile(path.resolve(__dirname, "..", "dist", "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error("Unhandled error:", error.message);
  response.status(500).json({ error: error.message || "Internal server error" });
});

export default app;
