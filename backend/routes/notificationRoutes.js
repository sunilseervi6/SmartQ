import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteReadNotifications
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Notifications
router.get("/", getNotifications);
router.put("/:notificationId/read", markAsRead);
router.put("/read-all", markAllAsRead);
router.delete("/read", deleteReadNotifications);

// Preferences
router.get("/preferences", getNotificationPreferences);
router.put("/preferences", updateNotificationPreferences);

export default router;
