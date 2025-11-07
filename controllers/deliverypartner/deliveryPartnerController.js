const { Partner } = require("../../models");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../utils/jwtUtils");
const { sendOTPViaSMS } = require("../../services/smsUtils");

const ENABLE_SMS = process.env.ENABLE_SMS === 'true';

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

    const lastPartner = await Partner.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['partnerCode'],
    });

    let nextNumber = 1;
    if (lastPartner && lastPartner.partnerCode) {
      const match = lastPartner.partnerCode.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }
    const partnerCode = `DP${String(nextNumber).padStart(4, '0')}`;

    const partner = await Partner.create({
      ...req.body,
      partnerCode,
      password: hash,
      rcFile,
      dlFile,
      idProofFile,
    });

    const data = partner.toJSON();
    delete data.password;

    const token = generateToken({
      id: partner.id,
      partnerCode: partner.partnerCode,
      email: partner.email,
      role: 'partner'
    });

    res.status(201).json({ 
      success: true, 
      message: "Registered successfully", 
      partner: data,
      token 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- CRUD -------------------
exports.getAll = async (req, res) => {
  try {
    const partners = await Partner.findAll({
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] }
    });
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry'] }
    });
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
    const profilePhoto = req.files?.profilePhoto ? `${req.protocol}://${req.get("host")}/uploads/${req.files.profilePhoto[0].filename}` : partner.profilePhoto;

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
      profilePhoto,
    });

    const data = partner.toJSON();
    delete data.password;

    res.json({ success: true, message: "Updated successfully", data });
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

// ------------------- Login -------------------
exports.login = async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;
    
    if (!emailOrMobile || !password) {
      return res.status(400).json({ success: false, message: "Email/Mobile and password required" });
    }

    const isEmail = emailOrMobile.includes('@');
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not found" : "Mobile not found" });
    }

    if (partner.status === "blocked") {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    if (partner.status === "inactive") {
      return res.status(403).json({ success: false, message: "Account inactive" });
    }

    const isMatch = await bcrypt.compare(password, partner.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const partnerData = partner.toJSON();
    delete partnerData.password;

    const token = generateToken({
      id: partner.id,
      partnerCode: partner.partnerCode,
      email: partner.email,
      role: 'partner'
    });

    res.json({ success: true, message: "Login successful", data: partnerData, token });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Send OTP (AWS SNS Integrated) -------------------
exports.sendOTP = async (req, res) => {
  try {
    const { emailOrMobile } = req.body;
    
    if (!emailOrMobile) {
      return res.status(400).json({ success: false, message: "Email or Mobile required" });
    }

    const isEmail = emailOrMobile.includes('@');
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not registered" : "Mobile not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await partner.update({ otp, otpExpiry, otpVerified: false });

    // Send OTP via AWS SNS
    if (ENABLE_SMS && !isEmail) {
      try {
        await sendOTPViaSMS(partner.mobile, otp, "password-reset");
      } catch (smsError) {
        console.error("SMS sending failed:", smsError);
      }
    } else {
      console.log(`🔥 [DEV MODE] OTP for ${emailOrMobile}: ${otp}`);
    }

    res.json({ 
      success: true, 
      message: "Verification code sent",
      ...(process.env.NODE_ENV === 'development' && { otp })
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
      return res.status(400).json({ success: false, message: "Email/Mobile and OTP required" });
    }

    const isEmail = emailOrMobile.includes('@');
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!partner.otp) {
      return res.status(400).json({ success: false, message: "No OTP found" });
    }

    if (new Date() > partner.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (partner.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await partner.update({ otpVerified: true });

    res.json({ success: true, message: "OTP verified successfully" });

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
      return res.status(400).json({ success: false, message: "Email/Mobile and new password required" });
    }

    const isEmail = emailOrMobile.includes('@');
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!partner.otpVerified) {
      return res.status(403).json({ success: false, message: "Please verify OTP first" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await partner.update({
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
      otpVerified: false
    });

    res.json({ success: true, message: "Password reset successful" });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Resend OTP (AWS SNS Integrated) -------------------
exports.resendOTP = async (req, res) => {
  try {
    const { emailOrMobile } = req.body;

    if (!emailOrMobile) {
      return res.status(400).json({ success: false, message: "Email or Mobile required" });
    }

    const isEmail = emailOrMobile.includes('@');
    const partner = await Partner.findOne({ 
      where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile }
    });

    if (!partner) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not registered" : "Mobile not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await partner.update({ otp, otpExpiry });

    // Send OTP via AWS SNS
    if (ENABLE_SMS && !isEmail) {
      try {
        await sendOTPViaSMS(partner.mobile, otp, "password-reset");
      } catch (smsError) {
        console.error("SMS sending failed:", smsError);
      }
    } else {
      console.log(`🔥 [DEV MODE] Resent OTP for ${emailOrMobile}: ${otp}`);
    }

    res.json({ 
      success: true, 
      message: "Verification code resent",
      ...(process.env.NODE_ENV === 'development' && { otp })
    });

  } catch (err) {
    console.error("Resend OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Logout -------------------
exports.logout = async (req, res) => {
  try {
    // Client will delete the JWT token
    return res.json({ success: true, message: "Logout successful" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};