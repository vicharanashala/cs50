import mongoose from "mongoose";

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
        replyTo: { type: mongoose.Schema.Types.ObjectId },
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        body: { type: String, trim: true, maxlength: 500 },
        upvotes: { type: Number, default: 0 },
        upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
answerSchema.index({ faq: 1, isAccepted: -1, upvotes: -1, createdAt: -1 });

export default mongoose.model("Answer", answerSchema);
