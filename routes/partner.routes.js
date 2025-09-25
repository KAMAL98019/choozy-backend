const express = require("express");
const router = express.Router();
const partnerController = require("../controllers/partner.controller");
const upload = require("../middlewares/upload"); // file upload middleware

// Partner Status
router.put("/status", partnerController.updateStatus);

// Orders
router.post("/assign", partnerController.assignOrder);
router.post("/reject", partnerController.rejectOrder);
router.put("/pickup/:id", partnerController.markPickup);
router.put("/deliver/:id", upload.single("photo"), partnerController.markDelivered);

// Earnings
router.get("/earnings", partnerController.getEarnings);

// Attendance
router.put("/attendance", upload.single("photo"), partnerController.uploadAttendance);

module.exports = router;
