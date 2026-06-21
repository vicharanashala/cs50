import mongoose from "mongoose";

const answerHistorySchema = new mongoose.Schema({
  answer: { type: mongoose.Schema.Types.ObjectId, ref: "Answer", required: true },
  editor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  previousBody: String,
  changedAt: { type: Date, default: Date.now },
});

answerHistorySchema.index({ answer: 1, changedAt: -1 });

export default mongoose.model("AnswerHistory", answerHistorySchema);
