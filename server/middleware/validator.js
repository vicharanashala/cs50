import { z } from "zod";
import { fail } from "../utils/response.js";

export function validate(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const issues = result.error.issues ?? result.error.errors ?? [];
      const errors = Object.fromEntries(issues.map((e) => [e.path.join("."), e.message]));
      return fail(response, 400, "Please fix the highlighted fields", errors);
    }
    request.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60).regex(/^[a-zA-Z ]+$/, "Name must be letters and spaces only"),
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[a-zA-Z]/, "Password must contain a letter").regex(/\d/, "Password must contain a number"),
  confirmPassword: z.string(),
  branch: z.enum(["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"]).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  rollNumber: z.string().trim().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const faqSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(200),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000),
  category: z.enum(["Interview Prep", "Coding Rounds", "Resume & Portfolio", "Application Process", "Stipend & Pay", "Work Culture", "Offer & PPO", "Remote Internships", "Higher Studies", "Other"]),
  company: z.string().trim().optional(),
  role: z.string().trim().optional(),
  branch: z.enum(["CSE", "ECE", "ME", "CE", "EE", "IT", "Other"]).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(25)).max(5).optional(),
  isAnonymous: z.boolean().optional(),
});

export const answerSchema = z.object({
  body: z.string().trim().min(20, "Answer must be at least 20 characters").max(5000),
  isAnonymous: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[a-zA-Z]/, "Password must contain a letter").regex(/\d/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
