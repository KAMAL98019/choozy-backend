const { Partner } = require("../models");
const bcrypt = require("bcryptjs");

// ------------------- Register -------------------
exports.register = async (req, res) => {
  try {
    const exists = await Partner.findOne({ where: { email: req.body.email } });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hash = await bcrypt.hash(req.body.password, 10);

    const rcFile = req.files?.rcFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.rcFile[0].filename}` : null;
    const dlFile = req.files?.dlFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.dlFile[0].filename}` : null;
    const idProofFile = req.files?.idProofFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.idProofFile[0].filename}` : null;

    const partner = await Partner.create({
      ...req.body,
      password: hash,
      rcFile,
      dlFile,
      idProofFile,
    });

    res.status(201).json({ success: true, message: "Registered successfully", partner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- CRUD -------------------
exports.getAll = async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    res.json({ success: true, data: partner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    const rcFile = req.files?.rcFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.rcFile[0].filename}` : partner.rcFile;
    const dlFile = req.files?.dlFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.dlFile[0].filename}` : partner.dlFile;
    const idProofFile = req.files?.idProofFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.idProofFile[0].filename}` : partner.idProofFile;

    // ✅ Add new logic for profile photo
    const profilePhoto = req.files?.profilePhoto
      ? `${req.protocol}://${req.get("host")}/uploads/${req.files.profilePhoto[0].filename}`
      : partner.profilePhoto;

    let password = partner.password;
    if (req.body.password) {
      password = await bcrypt.hash(req.body.password, 10);
    }

    await partner.update({
      ...req.body,
      password,
      rcFile,
      dlFile,
      idProofFile,
      profilePhoto, // ✅ include new field
    });

    res.json({ success: true, message: "Updated successfully", data: partner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.remove = async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found" });

    await partner.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// ------------------- Login (Email OR Mobile) -------------------
exports.login = async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;
    
    if (!emailOrMobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Mobile and password are required"
      });
    }

    // Check if input is email or mobile (simple check)
    const isEmail = emailOrMobile.includes('@');
    
    // Find partner by email OR mobile
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: isEmail ? "Email not found" : "Mobile number not found",
        field: "emailOrMobile"
      });
    }

    // Check status
    if (partner.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked. Please contact support."
      });
    }

    if (partner.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support."
      });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
        field: "password"
      });
    }

    const partnerData = partner.toJSON();
    delete partnerData.password;

    res.json({
      success: true,
      message: "Login successful",
      data: partnerData
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ------------------- Send OTP (Email OR Mobile) -------------------
exports.sendOTP = async (req, res) => {
  try {
    const { emailOrMobile } = req.body;
    
    if (!emailOrMobile) {
      return res.status(400).json({ 
        success: false, 
        message: "Email or Mobile number is required" 
      });
    }

    const isEmail = emailOrMobile.includes('@');
    
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: isEmail ? "Email not registered" : "Mobile number not registered"
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await partner.update({ otp, otpExpiry, otpVerified: false });

    // Send OTP via SMS if mobile, email if email
    if (isEmail) {
      // Send via email
      console.log(`📧 Email OTP for ${emailOrMobile}: ${otp}`);
    } else {
      // Send via SMS
      console.log(`📱 SMS OTP for ${emailOrMobile}: ${otp}`);
    }

    res.json({ 
      success: true, 
      message: "Verification code sent successfully",
      sentTo: isEmail ? "email" : "mobile"
    });

  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Verify OTP -------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { emailOrMobile, otp } = req.body;

    if (!emailOrMobile || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email/Mobile and OTP are required" 
      });
    }

    const isEmail = emailOrMobile.includes('@');
    
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!partner.otp) {
      return res.status(400).json({ 
        success: false, 
        message: "No OTP found. Please request a new one." 
      });
    }

    if (new Date() > partner.otpExpiry) {
      return res.status(400).json({ 
        success: false, 
        message: "OTP expired. Please request a new one." 
      });
    }

    if (partner.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP" 
      });
    }

    await partner.update({ otpVerified: true });

    res.json({ 
      success: true, 
      message: "OTP verified successfully" 
    });

  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Reset Password -------------------
exports.resetPassword = async (req, res) => {
  try {
    const { emailOrMobile, newPassword } = req.body;

    if (!emailOrMobile || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Email/Mobile and new password are required" 
      });
    }

    const isEmail = emailOrMobile.includes('@');
    
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!partner.otpVerified) {
      return res.status(403).json({ 
        success: false, 
        message: "Please verify OTP first" 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await partner.update({
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
      otpVerified: false
    });

    res.json({ 
      success: true, 
      message: "Password reset successful" 
    });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Resend OTP -------------------
exports.resendOTP = async (req, res) => {
  try {
    const { emailOrMobile } = req.body;

    if (!emailOrMobile) {
      return res.status(400).json({ 
        success: false, 
        message: "Email or Mobile number is required" 
      });
    }

    const isEmail = emailOrMobile.includes('@');
    
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: isEmail ? "Email not registered" : "Mobile number not registered"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await partner.update({ otp, otpExpiry });

    if (isEmail) {
      console.log(`📧 Resent Email OTP for ${emailOrMobile}: ${otp}`);
    } else {
      console.log(`📱 Resent SMS OTP for ${emailOrMobile}: ${otp}`);
    }

    res.json({ 
      success: true, 
      message: "Verification code resent successfully" 
    });

  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Logout -------------------
exports.logout = async (req, res) => {
  try {
    const { emailOrMobile } = req.body;
    
    if (!emailOrMobile) {
      return res.status(400).json({
        success: false,
        message: "Email or Mobile number is required"
      });
    }

    const isEmail = emailOrMobile.includes('@');
    
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (partner) {
      // Optional: Clear session data
      // await partner.update({ sessionToken: null, lastLogout: new Date() });
    }

    res.json({
      success: true,
      message: "Logout successful"
    });

  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};