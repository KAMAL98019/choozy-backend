// ==================== routes/user.routes.js ====================
const express = require("express");
const router = express.Router();
const userCtrl = require("../../controllers/customer/userController");
const upload = require("../../middlewares/uploadUser");
const { authenticateUser } = require("../../middlewares/authMiddleware");

// ============= PUBLIC ROUTES (No JWT Required) =============
router.post('/auth/send-mobile-otp', userCtrl.sendMobileOTP);
router.post('/auth/verify-mobile-otp', userCtrl.verifyMobileOTP);
router.post('/auth/complete-registration', userCtrl.completeRegistration);
router.post('/auth/login', userCtrl.login);
router.post('/auth/forgot-password/send-otp', userCtrl.sendPasswordResetOTP);
router.post('/auth/forgot-password/verify-otp', userCtrl.verifyPasswordResetOTP);
router.post('/auth/forgot-password/reset-password', userCtrl.resetPassword);
router.post('/auth/resend-otp', userCtrl.resendOTP);

// ============= PROTECTED ROUTES (JWT Required) =============
router.post('/auth/logout', authenticateUser, userCtrl.logout);
router.get('/profile', authenticateUser, userCtrl.getProfile);

// Admin routes (require JWT + admin check)
router.post("/", userCtrl.createUser);
router.get("/", authenticateUser, userCtrl.getUsers);
router.get("/:id", authenticateUser, userCtrl.getUserById);
router.put("/:id", authenticateUser, upload.single("profilePhoto"), userCtrl.updateUser);
router.delete("/:id", authenticateUser, userCtrl.deleteUser);

module.exports = router;