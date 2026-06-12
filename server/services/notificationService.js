import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { escapeRegex } from "../utils/helpers.js";

export async function notify({ recipient, actor, type, message, faq, answer }) {
  if (!recipient || String(recipient) === String(actor)) return;
  try {
    await Notification.create({ recipient, actor, type, message, faq, answer });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

export async function notifyMentions(body, { actor, faq, answer }) {
  const names = [...new Set([...String(body).matchAll(/@([a-zA-Z][a-zA-Z0-9_.-]{1,39})/g)].map((match) => match[1].replaceAll("_", " ")))];
  if (!names.length) return;
  const actorUser = await User.findById(actor).select("name").lean();
  const users = await User.find({
    $or: names.map((name) => ({ name: new RegExp(`^${escapeRegex(name)}(?:\\s|$)`, "i") })),
  }).select("_id name").lean();
  await Promise.all(users.map((user) => notify({
    recipient: user._id,
    actor,
    type: "mention",
    message: `You were mentioned by ${actorUser?.name ?? "another CrowdFAQ student"}`,
    faq,
    answer,
  })));
}
