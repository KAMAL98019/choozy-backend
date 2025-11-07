const { Notification } = require("../models");
const admin = require("../config/firebase");

// POST - Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, body, data, fcmToken } = req.body;

    // Validate request
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "userId, title, and body are required" });
    }

    // Save to DB with default status 'unread'
    const notification = await Notification.create({ userId, title, body, data, status: "unread" });

    // Send Firebase push notification if token exists
    if (fcmToken) {
      const message = {
        token: fcmToken,
        notification: { title, body },
        data: data || {}
      };

      try {
        await admin.messaging().send(message);
        console.log("✅ Push Notification sent to Firebase");
      } catch (firebaseError) {
        console.error("Firebase Error:", firebaseError.message);
      }
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error("Create Error:", error.message);
    res.status(500).json({ error: "Failed to save notification" });
  }
};

// GET - Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Get Error:", error.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// PUT - Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.status = "read";
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Update Error:", error.message);
    res.status(500).json({ error: "Failed to update notification" });
  }
};
