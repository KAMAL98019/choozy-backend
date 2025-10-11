'use strict';

const { Op } = require('sequelize');
const { RestaurantReg } = require('../models');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcryptjs");

// ---------------- CREATE RESTAURANT ----------------
exports.create = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

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
      operational_hours: JSON.stringify(req.body.operational_hours || []),
      fssai_certificate: req.body.fssai_certificate,
      gst_certificate: req.body.gst_certificate,
      bank_account_name: req.body.bank_account_name,
      account_number: req.body.account_number, // ✅ fixed typo
      ifsc_code: req.body.ifsc_code,
      agree_to_terms: !!req.body.agree_to_terms
    };

    if (!payload.rest_name || !payload.rest_address || !payload.fssai_certificate) {
      return res.status(400).json({ 
        error: 'Missing required fields: rest_name, rest_address, fssai_certificate' 
      });
    }

    const row = await RestaurantReg.create(payload);
    const data = row.toJSON();
    delete data.password; // remove password before response

    return res.status(201).json({ message: 'Restaurant created', data });
  } catch (e) {
    console.error("Create error:", e);
    return res.status(500).json({ error: e.message || 'Create failed' });
  }
};

// ---------------- LIST RESTAURANTS ----------------
exports.list = async (req, res) => {
  try {
    const { q, minCost, maxCost, page = 1, pageSize = 20 } = req.query;

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

    const data = rows.map(r => {
      const obj = r.toJSON();
      delete obj.password;
      return obj;
    });

    return res.json({
      total: count,
      page: Number(page),
      pageSize: limit,
      data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'List failed' });
  }
};

// ---------------- GET BY ID ----------------
exports.getById = async (req, res) => {
  try {
    const row = await RestaurantReg.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const data = row.toJSON();
    delete data.password;
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

// ---------------- UPDATE ----------------
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
      contact_number: req.body.contact_number,
      operational_hours: req.body.operational_hours ? JSON.stringify(req.body.operational_hours) : undefined,
      fssai_certificate: req.body.fssai_certificate,
      gst_certificate: req.body.gst_certificate,
      bank_account_name: req.body.bank_account_name,
      account_number: req.body.account_number,
      ifsc_code: req.body.ifsc_code,
      agree_to_terms: typeof req.body.agree_to_terms === 'boolean' ? req.body.agree_to_terms : undefined
    };

    // Hash password if provided
    if (req.body.password) {
      patch.password = await bcrypt.hash(req.body.password, 10);
    }

    Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
    await row.update(patch);

    const data = row.toJSON();
    delete data.password;
    return res.json({ message: 'Updated', data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Update failed' });
  }
};

// ---------------- DELETE ----------------
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

// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
  try {
    const { contact_email, password } = req.body;

    const restaurant = await RestaurantReg.findOne({ where: { contact_email } });
    if (!restaurant) return res.status(404).json({ error: "Email not found" });

    if (restaurant.status === "blocked") {
      return res.status(403).json({ error: "Your account is blocked. Please contact support." });
    }
    if (restaurant.status === "pending") {
      return res.status(403).json({ error: "Your account is still pending approval by admin." });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const data = restaurant.toJSON();
    delete data.password;
    res.json({ message: "Login successful", data });
  } catch (e) {
    console.error("Login Error:", e);
    res.status(500).json({ error: "Login failed" });
  }
};

// ---------------- RESET PASSWORD ----------------
exports.resetPassword = async (req, res) => {
  try {
    const { contact_email, newPassword } = req.body;

    const restaurant = await RestaurantReg.findOne({ where: { contact_email } });
    if (!restaurant) return res.status(404).json({ error: "Email not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    restaurant.password = hashedPassword;
    await restaurant.save();

    res.json({ message: "Password reset successful" });
  } catch (e) {
    console.error("Reset Error:", e);
    res.status(500).json({ error: "Password reset failed" });
  }
};


// PUT /restaurants/:id/delivery-settings
exports.updateDeliverySettings = async (req,res)=>{
  try{
    const { id } = req.params;
    const { deliveryType, deliveryRadius, deliveryZones, restaurantLatitude, restaurantLongitude, minOrderAmount, baseDeliveryFee } = req.body;

    const restaurant = await RestaurantReg.findByPk(id);
    if(!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    await restaurant.update({
      deliveryType, deliveryRadius, deliveryZones,
      restaurantLatitude, restaurantLongitude,
      minOrderAmount, baseDeliveryFee
    });

    res.json({ message:'Delivery settings updated', data: restaurant });
  }catch(e){
    res.status(500).json({ error: "Failed to update delivery settings" });
  }
};



