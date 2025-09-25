const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth.controller");

// OTP-based login
router.post("/send-otp", authCtrl.sendOtp);
router.post("/resend-otp", authCtrl.resendOtp);
router.post("/verify-otp", authCtrl.verifyOtp);
router.post("/create-account", authCtrl.createAccountAfterOtp);

// Email + Password login
router.post("/login-email", authCtrl.loginWithEmailPassword);  // ✅ new

// Mobile OTP login (existing)
router.post("/login", authCtrl.login);  

// Validation checks
router.get("/check-email", authCtrl.checkEmail);
router.get("/check-mobile", authCtrl.checkMobile);

// Logout
router.post("/logout", authCtrl.logout);

module.exports = router;
