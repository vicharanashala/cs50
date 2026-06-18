import { Router } from "express";
import User, { userFields, authorFields } from "../models/User.js";
import Faq from "../models/Faq.js";
import Answer from "../models/Answer.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { ok, fail } from "../utils/response.js";
import { objectId } from "../utils/helpers.js";
import { notify } from "../services/notificationService.js";
import { UserBadge } from "../models/Badge.js";

const router = Router();

router.get("/api/users/:id", optionalAuth, async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "User not found");
    const user = await User.findById(request.params.id).select(`${userFields} followers following`).lean();
    if (!user) return fail(response, 404, "User not found");
    const [faqs, answers] = await Promise.all([
      Faq.find({ author: user._id }).select("title category status createdAt").sort({ createdAt: -1 }).limit(10).lean(),
      Answer.find({ author: user._id }).populate("faq", "title").select("body faq createdAt isAccepted").sort({ createdAt: -1 }).limit(10).lean(),
    ]);
    delete user.savedFaqs;
    const followerCount = user.followers?.length ?? 0;
    const followingCount = user.following?.length ?? 0;
    const followedByViewer = request.user ? (user.followers ?? []).some((id) => id.equals(request.user.id)) : false;
    delete user.followers;
    delete user.following;
    return ok(response, { user, faqs, answers, followerCount, followingCount, followedByViewer });
  } catch (error) {
    next(error);
  }
});

router.post("/api/users/:id/follow", authenticate, async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "User not found");
    if (request.user._id.equals(request.params.id)) return fail(response, 400, "You cannot follow your own profile");
    const profile = await User.findById(request.params.id);
    if (!profile) return fail(response, 404, "User not found");
    request.user.following ??= [];
    profile.followers ??= [];
    const followed = request.user.following.some((id) => id.equals(profile.id));
    if (followed) {
      request.user.following.pull(profile.id);
      profile.followers.pull(request.user.id);
    } else {
      request.user.following.addToSet(profile.id);
      profile.followers.addToSet(request.user.id);
    }
    await Promise.all([request.user.save(), profile.save()]);
    if (!followed) {
      await notify({
        recipient: profile.id,
        actor: request.user.id,
        type: "new-follower",
        message: `${request.user.name} started following you`,
      });
    }
    return ok(response, {
      followed: !followed,
      followerCount: profile.followers.length,
      viewerFollowingCount: request.user.following?.length ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/api/users/:id/follows", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "Follow lists are private");
    const user = await User.findById(request.user.id)
      .populate("followers", "name reputation")
      .populate("following", "name reputation");
    return ok(response, { followers: user.followers ?? [], following: user.following ?? [] });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/users/:id", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "You can only edit your own profile");
    const allowed = ["name", "branch", "semester", "bio"];
    const setFields = {};
    const unsetFields = {};
    for (const field of allowed) {
      if (request.body[field] === null) {
        unsetFields[field] = "";
      } else if (request.body[field] !== undefined) {
        setFields[field] = request.body[field];
      }
    }
    const updateOp = {
      ...(Object.keys(setFields).length && { $set: setFields }),
      ...(Object.keys(unsetFields).length && { $unset: unsetFields }),
    };
    const user = await User.findByIdAndUpdate(request.user.id, updateOp, { new: true, runValidators: true }).select(userFields);
    return ok(response, { user });
  } catch (error) {
    next(error);
  }
});

router.get("/api/users/:id/saved-faqs", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "You can only view your own bookmarks");
    const user = await User.findById(request.user.id).populate({ path: "savedFaqs", populate: { path: "author", select: authorFields } });
    return ok(response, { faqs: user.savedFaqs });
  } catch (error) {
    next(error);
  }
});

router.get("/api/users/:id/followed-faqs", authenticate, async (request, response, next) => {
  try {
    if (!request.user._id.equals(request.params.id)) return fail(response, 403, "You can only view your followed FAQs");
    const user = await User.findById(request.user.id).populate({ path: "followedFaqs", populate: { path: "author", select: authorFields } });
    return ok(response, { faqs: user.followedFaqs });
  } catch (error) {
    next(error);
  }
});

router.get("/api/users/:id/badges", async (request, response, next) => {
  try {
    if (!objectId(request.params.id)) return fail(response, 404, "User not found");
    const userBadges = await UserBadge.find({ user: request.params.id }).populate("badge").sort({ awardedAt: -1 }).lean();
    return ok(response, { badges: userBadges });
  } catch (error) {
    next(error);
  }
});

router.get("/api/leaderboard", async (_request, response, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("name reputation questionsAsked answersGiven acceptedAnswers branch semester")
      .sort({ reputation: -1 })
      .limit(50)
      .lean();
    return ok(response, { users });
  } catch (error) {
    next(error);
  }
});

export default router;
