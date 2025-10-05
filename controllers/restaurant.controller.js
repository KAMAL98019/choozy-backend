'use strict';

const { Op } = require('sequelize');
const { RestaurantReg } = require('../models');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcryptjs");

// Create (Insert)
exports.create = async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  try {
    const payload = {
      id: uuidv4(),
      rest_name: req.body.rest_name,
      rest_address: req.body.rest_address,
      avg_cost_two: Number(req.body.avg_cost_two) || 0,
      rest_logo: req.body.rest_logo,
      contact_person_name: req.body.contact_person_name,
      contact_email: req.body.contact_email,
      password: hashedPassword,
      contact_number: req.body.contact_number,
      operational_hours: JSON.stringify(req.body.operational_hours || []), // ✅ stringify
      fssai_certificate: req.body.fssai_certificate,
      gst_certificate: req.body.gst_certificate,
      bank_account_name: req.body.bank_account_name,
      account_number: req.body.Account_number,
      ifsc_code: req.body.ifsc_code,
      agree_to_terms: !!req.body.agree_to_terms
    };

    // Removed cuisine_type check
    if (!payload.rest_name || !payload.rest_address || !payload.fssai_certificate) {
      return res.status(400).json({ 
        error: 'Missing required fields: rest_name, rest_address, fssai_certificate' 
      });
    }

    const row = await RestaurantReg.create(payload);
    return res.status(201).json({ message: 'restaurant created', data: row });
  } catch (e) {
    console.error("Create error:", e);
    return res.status(500).json({ error: e.message || 'Create failed' });
  }
};


// List (Get with search params)
exports.list = async (req, res) => {
  try {
    const {
      q,                 // full-text-ish search
      minCost, maxCost,  // avg_cost_two range
      page = 1,
      pageSize = 20
    } = req.query;

    const where = {};

    if (q) {
      where[Op.or] = [
        { rest_name: { [Op.like]: `%${q}%` } },
        { rest_address: { [Op.like]: `%${q}%` } }
      ];
    }

    if (minCost || maxCost) {
      where.avg_cost_two = {};
      if (minCost) where.avg_cost_two[Op.gte] = Number(minCost);
      if (maxCost) where.avg_cost_two[Op.lte] = Number(maxCost);
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { count, rows } = await RestaurantReg.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      total: count,
      page: Number(page),
      pageSize: limit,
      data: rows
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'List failed' });
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const row = await RestaurantReg.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const row = await RestaurantReg.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const patch = {
      rest_name: req.body.rest_name,
      rest_address: req.body.rest_address,
      avg_cost_two: req.body.avg_cost_two,
      rest_logo: req.body.rest_logo,
      contact_person_name: req.body.contact_person_name,
      contact_email: req.body.contact_email,
      password: req.body.password,
      contact_number: req.body.contact_number,
      operational_hours: req.body.operational_hours,
      fssai_certificate: req.body.fssai_certificate,
      gst_certificate: req.body.gst_certificate,
      bank_account_name: req.body.bank_account_name,
      account_number: req.body.Account_number,
      ifsc_code: req.body.ifsc_code,
      agree_to_terms: typeof req.body.agree_to_terms === 'boolean' ? req.body.agree_to_terms : undefined
    };

    // Remove undefined fields
    Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);

    await row.update(patch);
    return res.json({ message: 'Updated', data: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Update failed' });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const row = await RestaurantReg.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await row.destroy();
    return res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Delete failed' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { contact_email, password } = req.body;

    const restaurant = await RestaurantReg.findOne({ where: { contact_email } });
    if (!restaurant) {
      return res.status(404).json({ error: "Email not found" });
    }

    if (restaurant.status === "blocked") {
      return res.status(403).json({ error: "Your account is blocked. Please contact support." });
    }
    if (restaurant.status === "pending") {
      return res.status(403).json({ error: "Your account is still pending approval by admin." });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const restaurantData = restaurant.toJSON();
    delete restaurantData.password;

    res.json({ message: "Login successful", data: restaurantData });
  } catch (e) {
    console.error("Login Error:", e);
    res.status(500).json({ error: "Login failed" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { contact_email, newPassword } = req.body;

    const restaurant = await RestaurantReg.findOne({ where: { contact_email } });
    if (!restaurant) {
      return res.status(404).json({ error: "Email not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    restaurant.password = hashedPassword;
    await restaurant.save();

    res.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset Error:", e);
    res.status(500).json({ error: "Password reset failed" });
  }
};
