const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const deliveryPartner = require("../controllers/deliveryPartner.controller");


// ------------------- Multer config -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });



router.post("/register",upload.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
  ]), deliveryPartner.register);
router.get("/partner", deliveryPartner.getAll);
router.get("/partner/:id", deliveryPartner.getOne);
router.put("/partner/:id",upload.fields([
    { name: "rcFile", maxCount: 1 },
    { name: "dlFile", maxCount: 1 },
    { name: "idProofFile", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]), deliveryPartner.update);
router.delete("/partner/:id", deliveryPartner.remove);



router.post("/login", deliveryPartner.login);
router.post("/logout", deliveryPartner.logout);

// Forgot password flow routes
router.post('/forgot-password/send-otp', deliveryPartner.sendOTP);
router.post('/forgot-password/verify-otp', deliveryPartner.verifyOTP);
router.post('/forgot-password/reset-password', deliveryPartner.resetPassword);
router.post('/forgot-password/resend-otp', deliveryPartner.resendOTP);


module.exports = router;
