import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Faq from "../server/models/Faq.js";
import User from "../server/models/User.js";
import { startDb, stopDb, clearDb } from "./setup.js";

let author;

beforeAll(async () => {
  await startDb();
  author = await User.create({
    name: "Author",
    email: "author@example.com",
    password: await bcrypt.hash("password123", 10),
  });
}, 30000);

beforeEach(clearDb);

describe("FAQ CRUD", () => {
  it("should create a FAQ with valid data", async () => {
    const faq = await Faq.create({
      title: "How to prepare for technical interviews?",
      description: "I want to know the best resources and strategies for preparing for technical interviews at top companies.",
      category: "Interview Prep",
      author: author._id,
      followers: [author._id],
    });
    expect(faq).toBeDefined();
    expect(faq.title).toBe("How to prepare for technical interviews?");
    expect(faq.status).toBe("open");
    expect(faq.answerCount).toBe(0);
  });

  it("should reject FAQ with short title", async () => {
    const faq = new Faq({
      title: "Short",
      description: "This is a valid description that is long enough to pass validation",
      category: "Other",
      author: author._id,
    });
    await expect(faq.validate()).rejects.toThrow();
  });

  it("should allow close and reopen", async () => {
    const faq = await Faq.create({
      title: "Test close functionality for FAQ",
      description: "This FAQ tests the workflow of closing and reopening a FAQ entry",
      category: "Other",
      author: author._id,
      followers: [author._id],
    });
    faq.status = "closed";
    faq.closeReason = "duplicate";
    await faq.save();
    expect(faq.status).toBe("closed");
    expect(faq.closeReason).toBe("duplicate");

    faq.status = "open";
    faq.closeReason = undefined;
    await faq.save();
    expect(faq.status).toBe("open");
    expect(faq.closeReason).toBeUndefined();
  });

  it("should merge source FAQ into target", async () => {
    const target = await Faq.create({
      title: "Target FAQ for merge testing purposes",
      description: "This is the target FAQ that will receive answers from the source",
      category: "Other",
      author: author._id,
      followers: [author._id],
    });
    const source = await Faq.create({
      title: "Source duplicate FAQ for merge testing",
      description: "This is the source FAQ marked as duplicate that will be merged",
      category: "Other",
      author: author._id,
      closeReason: "duplicate",
      status: "closed",
    });
    const Answer = (await import("../server/models/Answer.js")).default;
    const answer = await Answer.create({ faq: source._id, author: author._id, body: "This answer should move to target after merge" });
    source.answerCount = 1;
    await source.save();

    await Answer.updateMany({ faq: source._id }, { faq: target._id });
    target.answerCount += source.answerCount;
    await target.save();
    await source.deleteOne();

    const movedAnswer = await Answer.findById(answer._id);
    expect(movedAnswer.faq.toString()).toBe(target._id.toString());
    const updatedTarget = await Faq.findById(target._id);
    expect(updatedTarget.answerCount).toBe(1);
  });
});

describe("FAQ Voting", () => {
  it("should upvote a FAQ", async () => {
    const faq = await Faq.create({
      title: "Voting test question for FAQ system",
      description: "Testing the voting mechanism to ensure upvotes increment correctly",
      category: "Other",
      author: author._id,
    });
    const voter = new mongoose.Types.ObjectId();
    faq.upvotedBy.push(voter);
    faq.upvotes = faq.upvotedBy.length;
    await faq.save();
    expect(faq.upvotes).toBe(1);
    expect(faq.upvotedBy).toHaveLength(1);
  });

  it("should toggle upvote", async () => {
    const faq = await Faq.create({
      title: "Toggle upvote test question for FAQ system",
      description: "Testing the toggle behavior of upvoting a question to ensure it can be undone",
      category: "Other",
      author: author._id,
    });
    const voter = new mongoose.Types.ObjectId();

    faq.upvotedBy.push(voter);
    faq.upvotes = faq.upvotedBy.length;
    expect(faq.upvotes).toBe(1);

    faq.upvotedBy.pull(voter);
    faq.upvotes = faq.upvotedBy.length;
    expect(faq.upvotes).toBe(0);
  });
});

describe("FAQ Search", () => {
  it("should find FAQ by title text search", async () => {
    await Faq.create({
      title: "Unique search term for testing purposes",
      description: "This FAQ contains a unique search term to verify text search functionality works",
      category: "Other",
      author: author._id,
    });
    const results = await Faq.find({ $text: { $search: "Unique search term" } }).lean();
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
