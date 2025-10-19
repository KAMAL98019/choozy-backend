const { Partner, PartnerAttendance, Earnings } = require("../models");
const multer = require("multer");
const path = require("path");
const { Op } = require("sequelize");
const fs = require("fs");

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

// ---------------- Helper Function ----------------
async function setPartnerStatus(partnerId, status, photo = null) {
  const partner = await Partner.findByPk(partnerId);
  if (!partner) throw new Error("Partner not found");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Check if there's already an attendance today
  let attendance = await PartnerAttendance.findOne({
    where: {
      partnerId,
      attendanceTime: { [Op.between]: [todayStart, todayEnd] },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!attendance) {
    // Create a new attendance if none today
    attendance = await PartnerAttendance.create({
      partnerId,
      status,
      attendancePhoto: photo,
      attendanceTime: new Date(),
    });
  } else {
    // Update existing attendance
    attendance.status = status;
    if (photo) attendance.attendancePhoto = photo;
    await attendance.save();
  }

  // Update partner table status
  const partnerStatus = status === "ONLINE" ? "active" : "inactive";
  await partner.update({ status: partnerStatus });

  return attendance;
}

// ---------------- Mark Attendance ----------------
exports.markAttendance = async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ message: "partnerId is required" });

    const attendance = await setPartnerStatus(partnerId, "ONLINE", req.file?.filename);

    res.status(201).json({
      message: "Attendance marked successfully and partner status set to active",
      attendance,
    });
  } catch (err) {
    console.error("❌ Error marking attendance:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// ---------------- Update Partner Status ----------------
exports.updateStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.body;
    if (!["ONLINE", "OFFLINE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const attendance = await setPartnerStatus(partnerId, status);

    res.status(200).json({
      message: `Partner status updated to ${status}`,
      attendance,
    });
  } catch (err) {
    console.error("❌ Error updating status:", err);
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
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default:
        return res.status(400).json({ message: "Invalid type. Use today, week, month, lastMonth" });
    }

    const earnings = await Earnings.findAll({
      where: { partnerId, createdAt: { [Op.between]: [startDate, endDate] } },
    });

    const total = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    res.json({ partnerId, type, total, count: earnings.length, earnings, startDate, endDate });
  } catch (err) {
    console.error("❌ Error fetching earnings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
