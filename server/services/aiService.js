import Faq from "../models/Faq.js";
import Answer from "../models/Answer.js";

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

export async function refreshFaqSummary(faqId) {
  const faq = await Faq.findById(faqId);
  if (!faq) throw new Error("FAQ_NOT_FOUND");
  const answers = await Answer.find({ faq: faq.id, isVerified: true })
    .sort({ isAccepted: -1, upvotes: -1, createdAt: -1 })
    .select("body")
    .lean();
  if (!answers.length) {
    faq.aiSummary = undefined;
    faq.aiSummaryUpdatedAt = undefined;
    await faq.save();
    return { summary: null, updatedAt: null, verifiedAnswerCount: 0 };
  }
  const summary = await generateAiText(
    `Question: ${faq.title}\n\nVerified answers:\n${answers.map((answer, index) => `${index + 1}. ${answer.body}`).join("\n")}`,
    "Summarize the verified student community answers into a concise, practical response. Do not invent facts. Use plain text and at most 180 words.",
  );
  if (!summary) throw new Error("AI_EMPTY_RESPONSE");
  faq.aiSummary = summary;
  faq.aiSummaryUpdatedAt = new Date();
  await faq.save();
  return { summary, updatedAt: faq.aiSummaryUpdatedAt, verifiedAnswerCount: answers.length };
}

export default generateAiText;
