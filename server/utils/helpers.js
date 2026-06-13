import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { jwtSecret } from "../config/env.js";

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function objectId(value) {
  return mongoose.isValidObjectId(value);
}

export function signToken(user, expiresIn = process.env.JWT_EXPIRES_IN ?? "7d") {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, jwtSecret, { expiresIn });
}

export function validationErrors(error) {
  return Object.fromEntries(Object.entries(error.errors).map(([field, detail]) => [field, detail.message]));
}

export function updateTrending(faq) {
  faq.isTrending = faq.upvotes > 5 || faq.answerCount > 3;
}

export function requireReputation(user, minimum, action) {
  if (user.reputation < minimum) {
    return `${action} requires at least ${minimum} reputation (you have ${user.reputation})`;
  }
  return null;
}

export async function createNotification({ recipient, actor, type, message, faq, answer }) {
  if (!recipient || String(recipient) === String(actor)) return;
  const Notification = (await import("../models/Notification.js")).default;
  await Notification.create({ recipient, actor, type, message, faq, answer });
}

export const harmfulChecks = [
  [(text) => (text.match(/https?:\/\/[^\s]+/gi) || []).length >= 3, "Remove some links — your content can include up to 2 URLs"],
  [/<[^>]*script\b/i, "Remove HTML script tags from your content"],
  [/\bonerror\s*=/i, "Remove onerror attributes from your content"],
  [/\bonclick\s*=/i, "Remove onclick attributes from your content"],
  [/\bonload\s*=/i, "Remove onload attributes from your content"],
  [/javascript\s*:/i, "Remove JavaScript URLs from your content"],
  [/(?:&#x?\d+;)+/, "Remove HTML entities from your content"],
  [/[\ud800-\udfff]{4,}/, "Remove invalid characters from your content"],
  [/(.)\1{30,}/, "Remove repeated characters from your content"],
];

export function harmfulReason(text) {
  if (!text) return null;
  for (const [check, message] of harmfulChecks) {
    if (typeof check === "function" ? check(text) : check.test(text)) return message;
  }
  return null;
}
