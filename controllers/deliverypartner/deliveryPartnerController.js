const { Partner } = require("../../models");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../utils/jwtUtils");
const { sendOTPToBoth } = require("../../services/otpUtils");

/**
 * Register a new delivery partner
 * @route POST /api/partners/register
 */
exports.register = async (req, res) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const { email, password, referralCode: inputReferralCode } = req.body;

      // ==================== VALIDATION ====================
      
      // Check if email already exists
      const existingPartner = await Partner.findOne({ 
        where: { email },
        raw: true 
      });
      
      if (existingPartner) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already registered" 
        });
      }

      // Validate referral code if provided
      if (inputReferralCode) {
        const referrer = await Partner.findOne({ 
          where: { referralCode: inputReferralCode },
          raw: true 
        });
        
        if (!referrer) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid referral code" 
          });
        }
      }

      // ==================== GENERATE PARTNER CODE ====================
      
      const lastPartner = await Partner.findOne({
        order: [['createdAt', 'DESC']],
        attributes: ['partnerCode'],
        raw: true,
      });
      
      let nextNumber = 1;
      if (lastPartner?.partnerCode) {
        const match = lastPartner.partnerCode.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0], 10) + 1;
        }
      }
      
      const partnerCode = `DP${String(nextNumber).padStart(4, '0')}`;

      // ==================== GENERATE REFERRAL CODE ====================
      
      // Generate unique referral code: DP + 3 timestamp chars + 2 random chars
      const generateReferralCode = () => {
        const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        return `DP${timestamp}${random}`;
      };

      let referralCode = generateReferralCode();
      
      // Ensure uniqueness (very rare collision check)
      let referralAttempt = 0;
      while (referralAttempt < 3) {
        const exists = await Partner.findOne({ 
          where: { referralCode },
          raw: true 
        });
        
        if (!exists) break;
        
        // Regenerate if collision
        referralCode = generateReferralCode();
        referralAttempt++;
      }

      // ==================== HASH PASSWORD ====================
      
      const hashedPassword = await bcrypt.hash(password, 10);

      // ==================== HANDLE FILE UPLOADS ====================
      
      const rcFile = req.files?.rcFile 
        ? `${req.protocol}://${req.get("host")}/uploads/${req.files.rcFile[0].filename}` 
        : null;
        
      const dlFile = req.files?.dlFile 
        ? `${req.protocol}://${req.get("host")}/uploads/${req.files.dlFile[0].filename}` 
        : null;
        
      const idProofFile = req.files?.idProofFile 
        ? `${req.protocol}://${req.get("host")}/uploads/${req.files.idProofFile[0].filename}` 
        : null;
        
      const profilePhoto = req.files?.profilePhoto 
        ? `${req.protocol}://${req.get("host")}/uploads/${req.files.profilePhoto[0].filename}` 
        : null;

      // ==================== CREATE PARTNER ====================
      
      const partnerData = {
        ...req.body,
        partnerCode,
        referralCode,
        password: hashedPassword,
        rcFile,
        dlFile,
        idProofFile,
        profilePhoto,
        status: 'active',
        otpVerified: false,
      };

      console.log('📝 Creating partner:', {
        partnerCode,
        referralCode,
        email,
        fullName: req.body.fullName,
      });

      const partner = await Partner.create(partnerData);

      // ==================== PREPARE RESPONSE ====================
      
      const responseData = partner.toJSON();
      
      // Remove sensitive fields
      delete responseData.password;
      delete responseData.otp;
      delete responseData.otpExpiry;

      // Generate JWT token
      const token = generateToken({
        id: partner.id,
        partnerCode: partner.partnerCode,
        email: partner.email,
        role: "partner"
      });

      console.log('✅ Partner registered successfully:', {
        id: partner.id,
        partnerCode: partner.partnerCode,
        email: partner.email,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          partner: responseData,
          token,
        }
      });

    } catch (err) {
      console.error('❌ Registration error:', {
        attempt: attempt + 1,
        name: err.name,
        message: err.message,
        fields: err.fields,
      });

      // ==================== ERROR HANDLING ====================

      // Handle unique constraint violation on partnerCode (retry)
      if (err.name === 'SequelizeUniqueConstraintError' && err.fields?.partnerCode) {
        attempt++;
        
        if (attempt >= maxRetries) {
          return res.status(500).json({ 
            success: false, 
            message: "Failed to generate unique partner code. Please try again." 
          });
        }
        
        console.log(`🔄 Retrying registration (attempt ${attempt + 1}/${maxRetries})...`);
        continue;
      }

      // Handle unique constraint on email
      if (err.name === 'SequelizeUniqueConstraintError' && err.fields?.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already registered"
        });
      }

      // Handle unique constraint on referralCode
      if (err.name === 'SequelizeUniqueConstraintError' && err.fields?.referralCode) {
        attempt++;
        
        if (attempt >= maxRetries) {
          return res.status(500).json({ 
            success: false, 
            message: "Failed to generate unique referral code. Please try again." 
          });
        }
        
        console.log(`🔄 Retrying registration due to referral code collision...`);
        continue;
      }

      // Handle validation errors
      if (err.name === 'SequelizeValidationError') {
        const errors = err.errors.map(e => ({
          field: e.path,
          message: e.message
        }));
        
        return res.status(400).json({ 
          success: false, 
          message: "Validation failed",
          errors
        });
      }

      // Handle database connection errors
      if (err.name === 'SequelizeConnectionError') {
        return res.status(503).json({ 
          success: false, 
          message: "Database connection error. Please try again later."
        });
      }
      
      // Handle all other errors
      return res.status(500).json({ 
        success: false, 
        message: "Registration failed",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // If all retries exhausted (shouldn't reach here)
  return res.status(500).json({ 
    success: false, 
    message: "Registration failed after multiple attempts. Please try again."
  });
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

// ------------------- Send OTP (SMS + Email Support) -------------------
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

    // ✅ Send OTP via both SMS and Email
    try {
      const result = await sendOTPToBoth(
        partner.mobile,
        partner.email,
        otp,
        "password-reset",
        partner.name || partner.contactPersonName
      );
      
      if (!result.success) {
        console.error("Password reset OTP failed:", result);
      }

      res.json({ 
        success: true, 
        message: "Verification code sent",
        sentVia: {
          sms: !!partner.mobile && result.results.sms.success,
          email: !!partner.email && result.results.email.success,
        },
        expiryMinutes: result.expiryMinutes,
        resendIntervalSeconds: result.resendIntervalSeconds,
        ...(process.env.NODE_ENV === 'development' && { otp })
      });

    } catch (otpError) {
      console.error("OTP sending error:", otpError);
      // Continue even if OTP sending fails
      res.json({ 
        success: true, 
        message: "OTP generated but sending failed",
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

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

// ------------------- Resend OTP (SMS + Email Support) -------------------
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

    // ✅ Send OTP via both SMS and Email
    try {
      const result = await sendOTPToBoth(
        partner.mobile,
        partner.email,
        otp,
        "password-reset",
        partner.name || partner.contactPersonName
      );
      
      if (!result.success) {
        console.error("OTP resend failed:", result);
      }

      res.json({ 
        success: true, 
        message: "Verification code resent",
        sentVia: {
          sms: !!partner.mobile && result.results.sms.success,
          email: !!partner.email && result.results.email.success,
        },
        expiryMinutes: result.expiryMinutes,
        resendIntervalSeconds: result.resendIntervalSeconds,
        ...(process.env.NODE_ENV === 'development' && { otp })
      });

    } catch (otpError) {
      console.error("OTP resend error:", otpError);
      res.json({ 
        success: true, 
        message: "OTP generated but sending failed",
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

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