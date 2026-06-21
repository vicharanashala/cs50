import { Router } from "express";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { ok, fail } from "../utils/response.js";

const router = Router();

router.get("/api/notifications", authenticate, async (request, response, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: request.user.id }).populate("actor", "name").sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ recipient: request.user.id, read: false }),
    ]);
    return ok(response, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/notifications/read-all", authenticate, async (request, response, next) => {
  try {
    await Notification.updateMany({ recipient: request.user.id, read: false }, { read: true });
    return ok(response, { unreadCount: 0 });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/notifications/:id/read", authenticate, async (request, response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: request.params.id, recipient: request.user.id, read: false },
      { read: true },
      { new: true },
    );
    if (!notification) return fail(response, 404, "Notification not found or already read");
    return ok(response, { notification });
  } catch (error) {
    next(error);
  }
});

export default router;
