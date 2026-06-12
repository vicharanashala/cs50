import nodemailer from "nodemailer";

const smtpTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendEmail(userId, subject, text) {
  if (!smtpTransport || !userId) return;
  const { default: User } = await import("../models/User.js");
  const user = await User.findById(userId).select("email").lean();
  if (!user?.email) return;
  try {
    await smtpTransport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: user.email,
      subject,
      text,
    });
  } catch (error) {
    console.error(`Email notification failed: ${error.message}`);
  }
}
