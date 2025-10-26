const { User,sequelize } = require("../models");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sendFirebaseOTP } = require("../utils/firebaseOTP");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);


exports.createUser = async (req, res) => {
  const transaction = await sequelize.transaction(); // 🔹 Start transaction
  try {
    const { name, email, password, mobile, birthday, anniversary } = req.body;
    if (!mobile) {
      await transaction.rollback();
      return res.status(400).json({ error: "Mobile is required" });
    }

    // 🔹 Check duplicates
    if (await User.findOne({ where: { mobile } })) {
      await transaction.rollback();
      return res.status(400).json({ error: "Mobile already used" });
    }

    if (email && await User.findOne({ where: { email } })) {
      await transaction.rollback();
      return res.status(400).json({ error: "Email already used" });
    }

    // 🔹 Get latest customerId safely inside transaction
    const lastUser = await User.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['customerId'],
      lock: transaction.LOCK.UPDATE, // 👈 prevents concurrent reads
      transaction,
    });

    let newCustomerId = 'CUST0001';
    if (lastUser && lastUser.customerId) {
      const lastNumber = parseInt(lastUser.customerId.replace('CUST', ''), 10);
      const nextNumber = lastNumber + 1;
      newCustomerId = 'CUST' + nextNumber.toString().padStart(4, '0');
    }

    // 🔹 Hash password
    const hashed = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    // 🔹 Create user safely
    const user = await User.create({
      customerId: newCustomerId,
      name: name || null,
      email: email || null,
      password: hashed,
      mobile,
      birthday: birthday || null,
      anniversary: anniversary || null,
    }, { transaction });

    await transaction.commit(); // ✅ Commit only if all ok

    return res.status(201).json({ message: "Account created", user });
  } catch (err) {
    console.error(err);
    await transaction.rollback(); // ❌ Rollback on error
    return res.status(500).json({ error: "Account creation failed" });
  }
};

// ------------------- Get All Users -------------------
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ------------------- Get User By ID -------------------
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};

// ------------------- Update User -------------------
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, birthday, anniversary } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (email && email !== user.email && await User.findOne({ where: { email } }))
      return res.status(400).json({ error: "Email already used" });

    const patch = { name, email, birthday, anniversary };
    if (password) patch.password = await bcrypt.hash(password, SALT_ROUNDS);
    if (req.file) patch.profilePhoto = `/uploads/users/${req.file.filename}`;

    await user.update(patch);
    return res.json({ message: "User updated", user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

// ------------------- Delete User -------------------
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await user.destroy();
    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
};

exports.sendMobileOTP = async (req, res) => {
  try {
    const { mobile, fcmToken } = req.body;
    if (!mobile || !fcmToken)
      return res.status(400).json({ success: false, message: "Mobile and FCM token required" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    let user = await User.findOne({ where: { mobile } });

    if (user) {
      await user.update({ otp, otpExpiry, otpVerified: false });
    } else {
      user = await User.create({ mobile, otp, otpExpiry, otpVerified: false, status: "pending" });
    }

    // ⚡ LOG OTP FOR TESTING
    console.log(`🔥 OTP for ${mobile}: ${otp}`);

    // Send OTP via Firebase FCM
    const sent = await sendFirebaseOTP(fcmToken, otp);
    if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

    res.json({ success: true, message: "OTP sent successfully", isNewUser: !user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Verify Mobile OTP -------------------
exports.verifyMobileOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.otp || new Date() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "OTP expired. Request new one." });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    await user.update({ otp: null, otpExpiry: null, otpVerified: true, status: "active" });

    const isNewUser = !user.name || !user.email;
    const userData = user.toJSON();
    delete userData.password;

    res.json({ success: true, message: "OTP verified", isNewUser, data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Complete Registration -------------------
exports.completeRegistration = async (req, res) => {
  try {
    const { mobile, name, email, password, birthday, anniversary } = req.body;
    if (!mobile || !name) return res.status(400).json({ success: false, message: "Mobile and name required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.otpVerified) return res.status(403).json({ success: false, message: "Please verify OTP first" });

    if (email && await User.findOne({ where: { email }, attributes: ['id'] }).then(e => e && e.id !== user.id))
      return res.status(400).json({ success: false, message: "Email already used" });

    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    await user.update({ name, email: email || null, password: hashedPassword, birthday: birthday || null, anniversary: anniversary || null, otpVerified: false });

    const userData = user.toJSON();
    delete userData.password;

    res.json({ success: true, message: "Registration completed successfully", data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Login -------------------
exports.login = async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;
    if (!emailOrMobile || !password) return res.status(400).json({ success: false, message: "Email/Mobile and password required" });

    const isEmail = emailOrMobile.includes('@');
    const user = await User.findOne({ where: isEmail ? { email: emailOrMobile } : { mobile: emailOrMobile } });

    if (!user) return res.status(404).json({ success: false, message: isEmail ? "Email not found" : "Mobile not found" });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: "Account not active" });
    if (!user.password) return res.status(400).json({ success: false, message: "Use OTP to login" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

    const userData = user.toJSON();
    delete userData.password;

    res.json({ success: true, message: "Login successful", data: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Resend OTP -------------------
exports.resendOTP = async (req, res) => {
  try {
    const { mobile, fcmToken } = req.body;
    if (!mobile || !fcmToken) return res.status(400).json({ success: false, message: "Mobile and FCM token required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "Mobile not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await user.update({ otp, otpExpiry });
    const sent = await sendFirebaseOTP(fcmToken, otp);
    if (!sent) return res.status(500).json({ success: false, message: "Failed to resend OTP" });

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Forgot & Reset Password -------------------
exports.sendPasswordResetOTP = async (req, res) => {
  try {
    const { mobile, fcmToken } = req.body;
    if (!mobile || !fcmToken) return res.status(400).json({ success: false, message: "Mobile and FCM token required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "Mobile not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await user.update({ otp, otpExpiry, otpVerified: false });
    const sent = await sendFirebaseOTP(fcmToken, otp);
    if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

    res.json({ success: true, message: "OTP sent for password reset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: "Mobile and OTP required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.otp || new Date() > user.otpExpiry) return res.status(400).json({ success: false, message: "OTP expired" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

    await user.update({ otpVerified: true });
    res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;
    if (!mobile || !newPassword) return res.status(400).json({ success: false, message: "Mobile and new password required" });

    const user = await User.findOne({ where: { mobile } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.otpVerified) return res.status(403).json({ success: false, message: "OTP not verified" });

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.update({ password: hashedPassword, otp: null, otpExpiry: null, otpVerified: false });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Logout -------------------
exports.logout = async (req, res) => {
  res.json({ success: true, message: "Logout successful" });
};
