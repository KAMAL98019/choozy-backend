// ==================== routes/deliveryPartner.routes.js ====================
const express = require("express");
const router = express.Router();
const deliveryPartner = require("../controllers/deliveryPartner.controller");
const uploadPartner = require("../middlewares/uploadPartner");
const { authenticatePartner } = require("../middlewares/auth.middleware");

// ============= PUBLIC ROUTES (No JWT Required) =============
router.post("/register", uploadPartner.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
]), deliveryPartner.register);
router.post("/login", deliveryPartner.login);
router.post("/forgot-password/send-otp", deliveryPartner.sendOTP);
router.post("/forgot-password/verify-otp", deliveryPartner.verifyOTP);
router.post("/forgot-password/reset-password", deliveryPartner.resetPassword);
router.post("/forgot-password/resend-otp", deliveryPartner.resendOTP);

// ============= PROTECTED ROUTES (JWT Required) =============
router.post("/logout", authenticatePartner, deliveryPartner.logout);
router.get("/partner", authenticatePartner, deliveryPartner.getAll);
router.get("/partner/:id", authenticatePartner, deliveryPartner.getOne);
router.put("/partner/:id", authenticatePartner, uploadPartner.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
]), deliveryPartner.update);
router.delete("/partner/:id", authenticatePartner, deliveryPartner.remove);

module.exports = router;