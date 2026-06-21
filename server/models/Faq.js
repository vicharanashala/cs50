import mongoose from "mongoose";

const categories = [
  "Interview Prep", "Coding Rounds", "Resume & Portfolio", "Application Process",
  "Stipend & Pay", "Work Culture", "Offer & PPO", "Remote Internships",
  "Higher Studies", "Other",
];
const branches = ["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"];

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
    downvotes: { type: Number, default: 0 },
    downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    answerCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["open", "answered", "closed"], default: "open" },
    closeReason: { type: String, enum: ["duplicate", "off-topic", "resolved", "other"] },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Faq" },
    isTrending: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
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

export default mongoose.model("Faq", faqSchema);
