const express = require("express");
const router = express.Router();
const attendanceController = require("../../controllers/deliverypartner/partnerAttendance.controller");
const uploadAttendance = require("../../middlewares/uploadAttendance");
const { authenticatePartner } = require("../../middlewares/authMiddleware");

// ✅ Mark Attendance (with photo upload)
router.post(
  "/attendance",authenticatePartner,
  uploadAttendance.single("attendancePhoto"),
  attendanceController.markAttendance
);

// ✅ Update Partner Status (ONLINE / OFFLINE)
router.put("/attendance/:partnerId/status",authenticatePartner, attendanceController.updateStatus);

// ✅ Update Partner Live Location (latitude & longitude)
router.put("/attendance/:partnerId/location",authenticatePartner, attendanceController.updateLocation);

// ✅ Get Partner Earnings (today / week / month / lastMonth)
router.get("/attendance/earnings",authenticatePartner, attendanceController.getEarnings);

module.exports = router;
