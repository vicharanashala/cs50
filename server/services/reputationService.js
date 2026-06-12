import User from "../models/User.js";

export async function updateReputation(userId, delta) {
  if (!delta) return;
  await User.findByIdAndUpdate(userId, { $inc: { reputation: delta } });
}
