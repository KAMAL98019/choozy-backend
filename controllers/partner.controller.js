const { PartnerStatus, PartnerAttendance, DeliveryOrder, Earnings } = require("../models");
const admin = require("../config/firebase");
const { Op } = require("sequelize");


// ✅ Update Partner Status (online/offline + fcm token)
exports.updateStatus = async (req, res) => {
  try {
    const { partnerId, status, fcmToken } = req.body;

    if (!partnerId || !status) {
      return res.status(400).json({ message: "partnerId and status are required" });
    }

    let partnerStatus = await PartnerStatus.findOne({ where: { partnerId } });

    if (!partnerStatus) {
      partnerStatus = await PartnerStatus.create({ partnerId, status, fcmToken });
    } else {
      partnerStatus.status = status;
      if (fcmToken) partnerStatus.fcmToken = fcmToken;
      await partnerStatus.save();
    }

    res.json({ message: "Status updated", partnerStatus });
  } catch (err) {
    console.error("UpdateStatus Error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};



// ✅ Assign Order & Send FCM
exports.assignOrder = async (req, res) => {
  try {
    const { partnerId, orderId } = req.body;

    // 1️⃣ Create the delivery order
    const order = await DeliveryOrder.create({ partnerId, orderId });

    // 2️⃣ Check for partner status (fcmToken)
    const partnerStatus = await PartnerStatus.findOne({ where: { partnerId } });

    // 3️⃣ Send notification only if token exists
    if (partnerStatus?.fcmToken) {
      try {
        await admin.messaging().send({
          token: partnerStatus.fcmToken,
          notification: {
            title: "New Order Assigned",
            body: `Order ${orderId} assigned to you`,
          },
          data: { orderId },
        });
      } catch (fcError) {
        console.warn("FCM notification failed:", fcError.message);
        // continue; don't fail the request
      }
    } else {
      console.log("No FCM token found for this partner. Skipping notification.");
    }

    // 4️⃣ Return success response
    res.json({ message: "Order assigned", order });
  } catch (err) {
    console.error("Assign Order Error:", err);
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};



// ✅ Pickup
exports.markPickup = async (req, res) => {
  try {
    const { id } = req.params; // deliveryOrder id
    const { latitude, longitude } = req.body;

    const order = await DeliveryOrder.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "pickedup";
    order.pickupTime = new Date();
    order.latitude = latitude;
    order.longitude = longitude;

    await order.save();
    res.json({ message: "Order picked up with location", order });
  } catch (err) {
    res.status(500).json(err);
  }
};


// ✅ Reject Order
exports.rejectOrder = async (req, res) => {
  try {
    const { partnerId, orderId, reason } = req.body;

    const order = await DeliveryOrder.findOne({ where: { orderId, partnerId } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "rejected";
    order.rejectionReason = reason || null;
    await order.save();

    res.json({ message: "Order rejected", order });
  } catch (err) {
    res.status(500).json(err);
  }
};


// ✅ Delivered + Earnings
exports.markDelivered = async (req, res) => {
  try {
    const { id } = req.params; // deliveryOrder id
    const { amount } = req.body;

    const order = await DeliveryOrder.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Upload proof photo if available
    let proofUrl = order.proofUrl;
    if (req.file) {
      proofUrl = `${req.protocol}://${req.get("host")}/uploads/proofs/${req.file.filename}`;
    }

    order.status = "delivered";
    order.deliveryTime = new Date();
    order.proofUrl = proofUrl;
    await order.save();

    // Earnings update
    await Earnings.create({
      partnerId: order.partnerId,
      orderId: order.orderId,
      amount,
    });

    res.json({ message: "Order delivered & earnings updated", order });
  } catch (err) {
    console.error("Mark Delivered Error:", err);
    res.status(500).json({ message: "Something went wrong", error: err });
  }
};


// ✅ Fetch Earnings
exports.getEarnings = async (req, res) => {
  try {
    const { partnerId, type } = req.query; // type = today, week, month, lastMonth

    let startDate, endDate;
    const now = new Date();

    switch (type) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date();
        break;
      case "week":
        startDate = new Date(now);
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default:
        return res.status(400).json({ message: "Invalid type. Use today, week, month, lastMonth" });
    }

    const earnings = await Earnings.findAll({
      where: {
        partnerId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
    });

    const total = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({ type, total, count: earnings.length, earnings });
  } catch (err) {
    res.status(500).json(err);
  }
};


// ✅ Attendance Upload
exports.uploadAttendance = async (req, res) => {
  try {
    const { partnerId } = req.body;

    const partner = await PartnerAttendance.create({
      partnerId,
      attendancePhoto: req.file?.filename || null,
      attendanceTime: new Date(),
    });

    res.json({ message: "Attendance uploaded", partner });
  } catch (err) {
    res.status(500).json(err);
  }
};
