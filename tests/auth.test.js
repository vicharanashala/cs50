import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../server/models/User.js";
import { startDb, stopDb, clearDb } from "./setup.js";

beforeAll(startDb, 30000);
beforeEach(clearDb);

describe("User Registration", () => {
  it("should create a user with valid data", async () => {
    const user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("password123", 10),
    });
    expect(user).toBeDefined();
    expect(user.name).toBe("Test User");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("student");
    expect(user.isEmailVerified).toBe(false);
  });

  it("should reject duplicate emails", async () => {
    await User.create({
      name: "User One",
      email: "dup@example.com",
      password: await bcrypt.hash("password123", 10),
    });
    await expect(User.create({
      name: "User Two",
      email: "DUP@example.com",
      password: await bcrypt.hash("password456", 10),
    })).rejects.toThrow();
  });

  it("should enforce name length", async () => {
    const user = new User({
      name: "A",
      email: "a@example.com",
      password: await bcrypt.hash("password123", 10),
    });
    await expect(user.validate()).rejects.toThrow();
  });
});

describe("User Login", () => {
  it("should verify password correctly", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    const match = await bcrypt.compare("secret123", hash);
    expect(match).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await bcrypt.hash("secret123", 10);
    const match = await bcrypt.compare("wrongpass", hash);
    expect(match).toBe(false);
  });

  it("should sign and verify JWT", () => {
    const payload = { id: new mongoose.Types.ObjectId().toString() };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(payload.id);
  });
});
