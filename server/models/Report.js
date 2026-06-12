import mongoose from "mongoose";

const reportReasons = ["spam", "duplicate", "inappropriate", "other"];

const reportSchema = new mongoose.Schema(
  {
    contentType: { type: String, enum: ["faq", "answer"], required: true },
    content: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "contentModel" },
    contentModel: { type: String, enum: ["Faq", "Answer"], required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: reportReasons, required: true },
    resolved: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const reportReasonsList = reportReasons;
export default mongoose.model("Report", reportSchema);
