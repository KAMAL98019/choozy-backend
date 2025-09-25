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

    // Handle file updates
    const rcFile = req.files?.rcFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.rcFile[0].filename}` : partner.rcFile;
    const dlFile = req.files?.dlFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.dlFile[0].filename}` : partner.dlFile;
    const idProofFile = req.files?.idProofFile ? `${req.protocol}://${req.get("host")}/uploads/${req.files.idProofFile[0].filename}` : partner.idProofFile;

    // Hash password if updating
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

// ------------------- Login -------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });

    const partner = await Partner.findOne({ where: { email } });
    if (!partner) return res.status(404).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, partner.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, message: "Login successful", partner });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- Forgot Password -------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ success: false, message: "Email and new password required" });

    const partner = await Partner.findOne({ where: { email } });
    if (!partner) return res.status(404).json({ success: false, message: "User not found" });

    const hash = await bcrypt.hash(newPassword, 10);
    await partner.update({ password: hash });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
