const { Partner, PartnerAttendance, Earnings } = require("../models");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, "..", "uploads", "attendance");
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error("❌ Failed to create upload path:", err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });
exports.uploadMiddleware = upload.single("attendancePhoto");

// ---------------- Helper: Set Partner Status ----------------
async function setPartnerStatus(partnerId, status, latitude = null, longitude = null, photo = null) {
  const partner = await Partner.findByPk(partnerId);
  if (!partner) throw new Error("Partner not found");

  // Update partner status and location
  await partner.update({
    status: status === "ONLINE" ? "active" : "inactive",
    latitude: latitude ?? partner.latitude,
    longitude: longitude ?? partner.longitude,
  });

  // Check if attendance already exists today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let attendance = await PartnerAttendance.findOne({
    where: {
      partnerId,
      attendanceTime: { [Op.between]: [todayStart, todayEnd] },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!attendance) {
    attendance = await PartnerAttendance.create({
      partnerId,
      status,
      attendancePhoto: photo,
      attendanceTime: new Date(),
    });
  } else {
    attendance.status = status;
    if (photo) attendance.attendancePhoto = photo;
    await attendance.save();
  }

  return attendance;
}

// ---------------- Mark Attendance ----------------
exports.markAttendance = async (req, res) => {
  try {
    const { partnerId, latitude, longitude } = req.body;
    if (!partnerId) return res.status(400).json({ message: "partnerId is required" });

    const attendance = await setPartnerStatus(
      partnerId,
      "ONLINE",
      parseFloat(latitude),
      parseFloat(longitude),
      req.file?.filename
    );

    res.status(201).json({
      message: "Attendance marked successfully & partner set to active",
      attendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// ---------------- Update Partner Status ----------------
exports.updateStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, latitude, longitude } = req.body;

    if (!["ONLINE", "OFFLINE"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const attendance = await setPartnerStatus(
      partnerId,
      status,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(200).json({
      message: `Partner status updated to ${status}`,
      attendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// ---------------- Update Partner Location ----------------
exports.updateLocation = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { latitude, longitude } = req.body;

    if (!partnerId || latitude == null || longitude == null)
      return res.status(400).json({ message: "partnerId, latitude, longitude are required" });

    const partner = await Partner.findByPk(partnerId);
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    await partner.update({ latitude: parseFloat(latitude), longitude: parseFloat(longitude) });

    res.status(200).json({
      message: "Partner location updated successfully",
      data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// ---------------- Fetch Partner Earnings ----------------
exports.getEarnings = async (req, res) => {
  try {
    const { partnerId, type } = req.query;
    if (!partnerId) return res.status(400).json({ message: "partnerId is required" });

    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        const day = now.getDay() || 7;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (day - 1));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default:
        return res.status(400).json({ message: "Invalid type. Use today, week, month, lastMonth" });
    }

    const earnings = await Earnings.findAll({
      where: { partnerId, createdAt: { [Op.between]: [startDate, endDate] } },
    });

    const total = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    res.status(200).json({ partnerId, type, total, count: earnings.length, earnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};
