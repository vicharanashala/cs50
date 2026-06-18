import { randomBytes } from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import User, { userFields } from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { signToken } from "../utils/helpers.js";
import { ok, fail } from "../utils/response.js";
import { sendEmail } from "../services/emailService.js";
import { checkBruteForce, recordFailedAttempt, clearAttempts } from "../middleware/bruteForce.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../middleware/validator.js";
import { awardBadges } from "../services/badgeService.js";

const router = Router();

router.post("/api/auth/register", validate(registerSchema), async (request, response, next) => {
  try {
    const { name, email, password, branch, semester, rollNumber } = request.body;
    const branches = ["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"];
    const errors = {};
    if (branch && !branches.includes(branch)) errors.branch = "Choose a valid branch";
    if (semester && (!Number.isInteger(Number(semester)) || Number(semester) < 1 || Number(semester) > 8)) {
      errors.semester = "Choose a semester from 1 to 8";
    }
    if (await User.exists({ email })) errors.email = "Email is already in use";
    if (Object.keys(errors).length) return fail(response, 400, "Please fix the highlighted fields", errors);

    const crypto = await import("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      branch: branch || undefined,
      semester: semester || undefined,
      rollNumber,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      lastActive: new Date(),
    });
    try {
      await sendEmail(user.email, "Verify your CrowdFAQ email", `Click this link to verify your email: ${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/api/auth/verify-email/${verificationToken}`);
    } catch {
      console.error("Failed to send verification email");
    }
    const newBadges = await awardBadges(user.id);
    return ok(response, { token: signToken(user), user: await User.findById(user.id).select(userFields), newBadges }, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/api/auth/login", validate(loginSchema), async (request, response, next) => {
  try {
    const { email, password, rememberMe } = request.body;
    const blocked = checkBruteForce(email);
    if (blocked) return fail(response, 429, blocked);
    const user = await User.findOne({ email: String(email ?? "").toLowerCase() }).select("+password");
    if (!user) return fail(response, 404, "No account found with this email");
    if (user.isBanned) return fail(response, 403, "Your account has been banned");
    if (!await bcrypt.compare(String(password ?? ""), user.password)) {
      recordFailedAttempt(email);
      return fail(response, 401, "Incorrect email or password");
    }
    clearAttempts(email);
    user.lastActive = new Date();
    await user.save();
    const newBadges = await awardBadges(user.id);
    return ok(response, {
      token: signToken(user, rememberMe ? "30d" : process.env.JWT_EXPIRES_IN ?? "7d"),
      user: await User.findById(user.id).select(userFields),
      newBadges,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/api/auth/admin/login", async (request, response, next) => {
  try {
    const email = request.body.email;
    const blocked = checkBruteForce(email);
    if (blocked) return fail(response, 429, blocked);
    const user = await User.findOne({ email: String(email ?? "").toLowerCase() }).select("+password");
    if (!user || !await bcrypt.compare(String(request.body.password ?? ""), user.password)) {
      recordFailedAttempt(email);
      return fail(response, 401, "Incorrect email or password");
    }
    clearAttempts(email);
    if (user.role !== "admin") return fail(response, 403, "This page is for administrators only");
    return ok(response, { token: signToken(user), user: await User.findById(user.id).select(userFields) });
  } catch (error) {
    next(error);
  }
});

router.post("/api/auth/forgot-password", validate(forgotPasswordSchema), async (request, response, next) => {
  try {
    const { email } = request.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return ok(response, { message: "If that email exists, a reset link has been sent" });
    const token = randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();
    const resetUrl = `${request.protocol}://${request.get("host")}/reset-password/${token}`;
    const text = `Reset your CrowdFAQ password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`;
    await sendEmail(user.email, "CrowdFAQ Password Reset", text);
    console.log(`Password reset link for ${user.email}: ${resetUrl}`);
    return ok(response, { message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    next(error);
  }
});

router.get("/api/auth/verify-email/:token", async (request, response, next) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: request.params.token,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) return fail(response, 400, "Invalid or expired verification link");
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return ok(response, { message: "Email verified successfully. You can now use all features." });
  } catch (error) {
    next(error);
  }
});

router.post("/api/auth/reset-password/:token", validate(resetPasswordSchema), async (request, response, next) => {
  try {
    const { password } = request.body;
    const user = await User.findOne({
      resetPasswordToken: request.params.token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password");
    if (!user) return fail(response, 400, "Invalid or expired reset token");
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.lastActive = new Date();
    await user.save();
    return ok(response, { message: "Password reset successful. You can now login with your new password." });
  } catch (error) {
    next(error);
  }
});

router.get("/api/auth/me", authenticate, async (request, response) => {
  ok(response, { user: await User.findById(request.user.id).select(userFields) });
});

export default router;
