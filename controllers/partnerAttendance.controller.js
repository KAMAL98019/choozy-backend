const { Partner, PartnerAttendance, Earnings } = require("../models");
const multer = require("multer");
const path = require("path");
const { Op } = require("sequelize");
const fs = require("fs");

// Multer setup for attendance photo
// Multer storage with directory check
// Multer storage with directory check
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, "..", "uploads", "attendance");

      // Ensure directory exists (sync to avoid race conditions)
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (err) {
      console.error("❌ Failed to create upload path:", err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
exports.uploadMiddleware = upload.single("attendancePhoto");

exports.markAttendance = async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    const partner = await Partner.findByPk(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const attendance = await PartnerAttendance.create({
      partnerId,
      attendancePhoto: req.file ? req.file.filename : null,
      status: "ONLINE",
      attendanceTime: new Date(),
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (err) {
    console.error("❌ Error marking attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Update Partner Status (ONLINE / OFFLINE)
exports.updateStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status } = req.body;
    if (!["ONLINE", "OFFLINE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    let attendance = await PartnerAttendance.findOne({
      where: { partnerId },
      order: [["createdAt", "DESC"]],
    });

    if (!attendance) {
      // Create a new attendance record if none exists
      attendance = await PartnerAttendance.create({
        partnerId,
        status,
        attendanceTime: new Date(),
      });
      return res.status(201).json({
        message: "Attendance record created and status set",
        attendance,
      });
    }

    attendance.status = status;
    await attendance.save();

    res.json({ message: "Status updated successfully", attendance });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch Partner Earnings
exports.getEarnings = async (req, res) => {
  try {
    const { partnerId, type } = req.query;
    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;

      case "week":
        // Week starts Monday, ends Sunday
        const day = now.getDay() || 7; // Treat Sunday (0) as 7
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (day - 1));
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), 23, 59, 59);
        break;

      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
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

    const total = earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return res.json({
      partnerId,
      type,
      total,
      count: earnings.length,
      earnings,
      startDate,
      endDate
    });

  } catch (err) {
    console.error("❌ Error fetching earnings:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};