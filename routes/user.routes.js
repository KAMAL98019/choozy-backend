const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user.controller");
const upload = require("../middlewares/uploadUser"); // multer config file

// 👇 Create User — NO photo upload
router.post("/", userCtrl.createUser);

// Get all users
router.get("/", userCtrl.getUsers);

// Get user by ID
router.get("/:id", userCtrl.getUserById);

// 👇 Update User — photo upload allowed here only
router.put("/:id", upload.single("profilePhoto"), userCtrl.updateUser);

// Delete user
router.delete("/:id", userCtrl.deleteUser);
router.post('/auth/send-mobile-otp', userCtrl.sendMobileOTP);
router.post('/auth/verify-mobile-otp', userCtrl.verifyMobileOTP);

router.post('/auth/complete-registration', userCtrl.completeRegistration);
router.post('/auth/login', userCtrl.login);
router.post('/auth/forgot-password/send-otp', userCtrl.sendPasswordResetOTP);
router.post('/auth/forgot-password/verify-otp', userCtrl.verifyPasswordResetOTP);
router.post('/auth/forgot-password/reset-password', userCtrl.resetPassword);
router.post('/auth/resend-otp', userCtrl.resendOTP);
router.post('/auth/logout', userCtrl.logout);



module.exports = router;
