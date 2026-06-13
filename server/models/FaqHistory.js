import mongoose from "mongoose";

const faqHistorySchema = new mongoose.Schema({
  faq: { type: mongoose.Schema.Types.ObjectId, ref: "Faq", required: true },
  editor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  previousTitle: String,
  previousDescription: String,
  previousCategory: String,
  previousCompany: String,
  previousRole: String,
  previousTags: [{ type: String }],
  changedAt: { type: Date, default: Date.now },
});

faqHistorySchema.index({ faq: 1, changedAt: -1 });

export default mongoose.model("FaqHistory", faqHistorySchema);
