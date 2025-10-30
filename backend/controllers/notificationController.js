import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Get user's notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('roomId', 'name roomCode')
      .populate('shopId', 'name shopCode');

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({
      success: true,
      notification
    });
  } catch (err) {
    console.error("Mark notification as read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("Mark all as read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('notificationPreferences');

    res.json({
      success: true,
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error("Get notification preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { queueJoined, positionChange, nextInLine, yourTurn, queueCompleted } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPreferences: {
          queueJoined: queueJoined !== undefined ? queueJoined : true,
          positionChange: positionChange !== undefined ? positionChange : true,
          nextInLine: nextInLine !== undefined ? nextInLine : true,
          yourTurn: yourTurn !== undefined ? yourTurn : true,
          queueCompleted: queueCompleted !== undefined ? queueCompleted : true
        }
      },
      { new: true }
    ).select('notificationPreferences');

    res.json({
      success: true,
      message: "Notification preferences updated",
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error("Update notification preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete old read notifications (cleanup)
export const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.deleteMany({
      userId,
      isRead: true
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} read notifications`
    });
  } catch (err) {
    console.error("Delete read notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to create notification (used by other controllers)
export const createNotification = async (userId, notificationData) => {
  try {
    const notification = await Notification.create({
      userId,
      ...notificationData
    });
    return notification;
  } catch (err) {
    console.error("Create notification error:", err);
    throw err;
  }
};
