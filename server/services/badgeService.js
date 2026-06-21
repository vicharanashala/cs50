import { Badge, UserBadge } from "../models/Badge.js";
import User from "../models/User.js";

export async function awardBadges(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const badges = await Badge.find({});
  const newBadges = [];

  for (const badge of badges) {
    const alreadyHas = await UserBadge.exists({ user: userId, badge: badge.id });
    if (alreadyHas) continue;

    let earned = false;
    switch (badge.criteria.type) {
      case "questionsAsked":
        earned = user.questionsAsked >= badge.criteria.threshold;
        break;
      case "answersGiven":
        earned = user.answersGiven >= badge.criteria.threshold;
        break;
      case "reputation":
        earned = user.reputation >= badge.criteria.threshold;
        break;
      case "upvotesReceived":
        earned = (user.upvotesReceived ?? 0) >= badge.criteria.threshold;
        break;
      case "savedCount":
        earned = (user.savedFaqs?.length ?? 0) >= badge.criteria.threshold;
        break;
    }
    if (earned) {
      await UserBadge.create({ user: userId, badge: badge.id });
      newBadges.push(badge);
    }
  }
  return newBadges;
}
