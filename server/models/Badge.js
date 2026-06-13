import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  icon: { type: String, default: "🏆" },
  criteria: {
    type: { type: String, enum: ["questionsAsked", "answersGiven", "reputation", "upvotesReceived", "savedCount"], required: true },
    threshold: { type: Number, required: true },
  },
}, { timestamps: true });

const userBadgeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  badge: { type: mongoose.Schema.Types.ObjectId, ref: "Badge", required: true },
  awardedAt: { type: Date, default: Date.now },
});

userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

export const Badge = mongoose.model("Badge", badgeSchema);
export const UserBadge = mongoose.model("UserBadge", userBadgeSchema);
