import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 200 },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

tagSchema.index({ usageCount: -1 });

export default mongoose.model("Tag", tagSchema);
