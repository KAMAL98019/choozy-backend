const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/partnerAttendance.controller");
const uploadAttendance = require("../middlewares/uploadAttendance");

// ✅ Mark Attendance (with photo upload)
router.post(
  "/attendance",
  uploadAttendance.single("attendancePhoto"),
  attendanceController.markAttendance
);

// ✅ Update Partner Status (ONLINE / OFFLINE)
router.put("/attendance/:partnerId/status", attendanceController.updateStatus);

// ✅ Update Partner Live Location (latitude & longitude)
router.put("/attendance/:partnerId/location", attendanceController.updateLocation);

// ✅ Get Partner Earnings (today / week / month / lastMonth)
router.get("/attendance/earnings", attendanceController.getEarnings);

module.exports = router;
