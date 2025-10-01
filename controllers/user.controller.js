const { User } = require("../models");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, mobile, birthday, anniversary } = req.body;

    if (!mobile) return res.status(400).json({ error: "mobile is required" });

    // Check mobile/email uniqueness
    const byMobile = await User.findOne({ where: { mobile } });
    if (byMobile) return res.status(400).json({ error: "Mobile already used" });

    if (email) {
      const byEmail = await User.findOne({ where: { email } });
      if (byEmail) return res.status(400).json({ error: "Email already used" });
    }

    let hashed = null;
    if (password) hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name || null,
      email: email || null,
      password: hashed,
      mobile,
      birthday: birthday || null,
      anniversary: anniversary || null
    });

    return res.status(201).json({ message: "Account created", user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Account creation failed" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    return res.json(users);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, birthday, anniversary } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // if email change, ensure not used by others
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: "Email already used" });
    }

    let patch = { name, email, birthday, anniversary };
    if (password) patch.password = await bcrypt.hash(password, SALT_ROUNDS);

    await user.update(patch);
    return res.json({ message: "User updated", user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await user.destroy();
    return res.json({ message: "User deleted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to delete user" });
  }
};


