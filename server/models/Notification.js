import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["answer", "accepted", "mention", "followed-answer", "new-follower"], required: true },
    message: { type: String, required: true, trim: true },
    faq: { type: mongoose.Schema.Types.ObjectId, ref: "Faq" },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: "Answer" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, faq: 1, answer: 1, message: 1 }, { unique: true });

export default mongoose.model("Notification", notificationSchema);
