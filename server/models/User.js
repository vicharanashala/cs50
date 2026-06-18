import mongoose from "mongoose";

const branches = ["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "moderator", "admin"], default: "student" },
    branch: { type: String, enum: branches },
    semester: { type: Number, min: 1, max: 8 },
    rollNumber: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 200 },
    reputation: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    answersGiven: { type: Number, default: 0 },
    acceptedAnswers: { type: Number, default: 0 },
    savedFaqs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Faq" }],
    followedFaqs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Faq" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isBanned: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    lastActive: Date,
  },
  { timestamps: true },
);

export const userFields = "name email role branch semester rollNumber bio reputation questionsAsked answersGiven acceptedAnswers savedFaqs isBanned createdAt";
export const authorFields = "name reputation";

userSchema.index({ reputation: -1 });

export default mongoose.model("User", userSchema);
