const express = require("express");
const router = express.Router();
const deliveryPartner = require("../controllers/deliveryPartner.controller");
const uploadPartner = require("../middlewares/uploadPartner");

// Register Partner
router.post(
  "/register",
  uploadPartner.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
  ]),
  deliveryPartner.register
);

// Update Partner
router.put(
  "/partner/:id",
  uploadPartner.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]),
  deliveryPartner.update
);

// CRUD Routes
router.get("/partner", deliveryPartner.getAll);
router.get("/partner/:id", deliveryPartner.getOne);
router.delete("/partner/:id", deliveryPartner.remove);

// Auth Routes
router.post("/login", deliveryPartner.login);
router.post("/logout", deliveryPartner.logout);

// Forgot Password Flow
router.post("/forgot-password/send-otp", deliveryPartner.sendOTP);
router.post("/forgot-password/verify-otp", deliveryPartner.verifyOTP);
router.post("/forgot-password/reset-password", deliveryPartner.resetPassword);
router.post("/forgot-password/resend-otp", deliveryPartner.resendOTP);

module.exports = router;
