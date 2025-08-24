const { OtpVerification, User } = require("../models");
const twilio = require("twilio");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;
const client = twilio(accountSid, authToken);

const RESEND_INTERVAL = Number(process.env.OTP_RESEND_INTERVAL_SECONDS || 60);
const EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ====================
// Send OTP
// ====================
exports.sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: "mobile required" });

    const last = await OtpVerification.findOne({
      where: { mobile },
      order: [["createdAt", "DESC"]],
    });

    if (last) {
      const secondsSince =
        (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (secondsSince < RESEND_INTERVAL) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(
            RESEND_INTERVAL - secondsSince
          )} seconds before requesting again`,
        });
      }
    }

    const otp = genOtp();
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    await OtpVerification.create({
      mobile,
      otp,
      expiresAt,
      isVerified: false,
    });

    if (process.env.NODE_ENV === "development") {
      await client.messages.create({
        body: `Your OTP is ${otp}`,
        from: twilioPhone,
        to: mobile,
      });
      console.log(`📲 OTP for ${mobile} is: ${otp}`);
    }

    return res.json({ message: "OTP sent (check SMS or console)" });
  } catch (e) {
    console.error("sendOtp error:", e);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  return this.sendOtp(req, res);
};

// ====================
// Login with Mobile + OTP
// ====================
exports.login = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ error: "mobile and otp required" });
    }

    const record = await OtpVerification.findOne({
      where: { mobile, otp, isVerified: false },
      order: [["createdAt", "DESC"]],
    });

    if (!record) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date() > new Date(record.expiresAt))
      return res.status(400).json({ error: "OTP expired" });

    await record.update({ isVerified: true });

    let user = await User.findOne({ where: { mobile } });

    if (user) {
      return res.json({
        message: "Login successful",
        isNewUser: false,
        user,
      });
    } else {
      return res.json({
        message: "OTP verified — new user, proceed to signup",
        isNewUser: true,
        mobile,
      });
    }
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "Login failed" });
  }
};

// Verify OTP (same as login)
exports.verifyOtp = async (req, res) => {
  return this.login(req, res);
};

// ====================
// NEW: Login with Email + Password
// ====================
exports.loginWithEmailPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password || "");
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    return res.json({
      message: "Login successful",
      isNewUser: false,
      user,
    });
  } catch (e) {
    console.error("loginWithEmailPassword error:", e);
    return res.status(500).json({ error: "Login failed" });
  }
};

// ====================
// Create account after OTP verified
// ====================
exports.createAccountAfterOtp = async (req, res) => {
  try {
    const { name, email, password, mobile, birthday, anniversary } = req.body;
    if (!mobile) return res.status(400).json({ error: "mobile required" });

    const verified = await OtpVerification.findOne({
      where: { mobile, isVerified: true },
      order: [["updatedAt", "DESC"]],
    });

    // if (!verified) return res.status(403).json({ error: "Phone not verified via OTP" });

    const byMobile = await User.findOne({ where: { mobile } });
    if (byMobile)
      return res
        .status(400)
        .json({ error: "Account already exists with this mobile" });

    if (email) {
      const byEmail = await User.findOne({ where: { email } });
      if (byEmail)
        return res.status(400).json({ error: "Email already used" });
    }

    let hashed = null;
    if (password)
      hashed = await bcrypt.hash(
        password,
        Number(process.env.BCRYPT_SALT_ROUNDS || 10)
      );

    const user = await User.create({
      name: name || null,
      email: email || null,
      password: hashed,
      mobile,
      birthday: birthday || null,
      anniversary: anniversary || null,
    });

    return res.status(201).json({ message: "Account created", user });
  } catch (e) {
    console.error("createAccountAfterOtp error:", e);
    return res.status(500).json({ error: "Account creation failed" });
  }
};

// ====================
// Check account existence
// ====================
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email required" });
    const exists = await User.findOne({ where: { email } });
    return res.json({ exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to check email" });
  }
};

exports.checkMobile = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ error: "mobile required" });
    const exists = await User.findOne({ where: { mobile } });
    return res.json({ exists: !!exists });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to check mobile" });
  }
};

// ====================
// Logout
// ====================
exports.logout = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ error: "mobile required" });

    const latest = await OtpVerification.findOne({
      where: { mobile },
      order: [["createdAt", "DESC"]],
    });
    if (latest) {
      latest.isVerified = false;
      await latest.save();
    }
    return res.json({ message: "Logged out" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Logout failed" });
  }
};
