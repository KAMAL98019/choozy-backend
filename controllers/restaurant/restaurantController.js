const { Op } = require('sequelize');
const { RestaurantReg, RestaurantStatus, FoodItem } = require('../../models');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../utils/jwtUtils");
const { sendOTPViaSMS } = require("../../services/smsUtils");

const ENABLE_SMS = process.env.ENABLE_SMS === 'true';

exports.create = async (req, res) => {
  try {
    const {
      rest_name, rest_address, avg_cost_two, contact_person_name,
      contact_email, password, contact_number, operational_hours,
      bank_account_name, account_number, ifsc_code, agree_to_terms
    } = req.body;

    const rest_logo = req.files?.rest_logo?.[0]?.path || null;
    const fssai_certificate = req.files?.fssai_certificate?.[0]?.path || null;
    const gst_certificate = req.files?.gst_certificate?.[0]?.path || null;

    const missingFields = [];
    if (!rest_name) missingFields.push("rest_name");
    if (!rest_address) missingFields.push("rest_address");
    if (!contact_email) missingFields.push("contact_email");
    if (!contact_number) missingFields.push("contact_number");
    if (!password) missingFields.push("password");
    if (!fssai_certificate) missingFields.push("fssai_certificate");

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing: ${missingFields.join(", ")}` });
    }

    const existingRestaurant = await RestaurantReg.findOne({
      where: {
        [Op.or]: [{ contact_email }, { contact_number }, { rest_name }]
      }
    });
    if (existingRestaurant) {
      return res.status(400).json({ error: "Restaurant already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const last = await RestaurantReg.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['restaurant_code']
    });

    let nextNumber = 1;
    if (last && last.restaurant_code) {
      const match = last.restaurant_code.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }
    const restaurant_code = `REST${String(nextNumber).padStart(4, '0')}`;

    const payload = {
      id: uuidv4(),
      restaurant_code,
      rest_name, rest_address,
      avg_cost_two: Number(avg_cost_two) || 0,
      rest_logo, contact_person_name, contact_email,
      password: hashedPassword, contact_number,
      operational_hours: JSON.stringify(operational_hours || []),
      fssai_certificate, gst_certificate,
      bank_account_name, account_number, ifsc_code,
      agree_to_terms: !!agree_to_terms
    };

    const row = await RestaurantReg.create(payload);

    await RestaurantStatus.create({
      rest_id: row.id,
      status: 'OFFLINE',
      reason: 'New restaurant — awaiting approval'
    });

    const data = row.toJSON();
    delete data.password;

    const token = generateToken({
      id: row.id,
      restaurant_code: row.restaurant_code,
      email: row.contact_email,
      role: 'restaurant'
    });

    return res.status(201).json({
      success: true,
      message: 'Restaurant registered successfully',
      restaurant_code: data.restaurant_code,
      data,
      token
    });

  } catch (e) {
    console.error("Create Restaurant Error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
};

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
      where, limit, offset,
      order: [['createdAt', 'DESC']]
    });

    const data = rows.map(r => {
      const obj = r.toJSON();
      delete obj.password;
      return obj;
    });

    return res.json({ total: count, page: Number(page), pageSize: limit, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'List failed' });
  }
};

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

exports.getRestaurantFoods = async (req, res) => {
  try {
    const { id } = req.params;

    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: id },
      order: [['createdAt', 'DESC']],
    });

    if (!restStatus || restStatus.status !== 'ONLINE') {
      return res.status(403).json({
        success: false,
        message: 'Restaurant is currently offline',
      });
    }

    const foods = await FoodItem.findAll({ where: { rest_id: id } });
    res.json({ success: true, data: foods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch food items' });
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
    const restaurant = await RestaurantReg.findOne({ 
      where: isEmail ? { contact_email: emailOrMobile } : { contact_number: emailOrMobile }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not found" : "Mobile not found" });
    }

    if (restaurant.status === "blocked") {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    if (restaurant.status === "pending") {
      return res.status(403).json({ success: false, message: "Account pending approval" });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const data = restaurant.toJSON();
    delete data.password;

    const token = generateToken({
      id: restaurant.id,
      restaurant_code: restaurant.restaurant_code,
      email: restaurant.contact_email,
      role: 'restaurant'
    });

    res.json({ success: true, message: "Login successful", data, token });

  } catch (err) {
    console.error("Login Error:", err);
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
    return res.status(500).json({ success: false, error: err.message });
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
    const restaurant = await RestaurantReg.findOne({ 
      where: isEmail ? { contact_email: emailOrMobile } : { contact_number: emailOrMobile }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not registered" : "Mobile not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    
    await restaurant.update({ otp, otpExpiry, otpVerified: false });

    // Send OTP via AWS SNS
    if (ENABLE_SMS && !isEmail) {
      try {
        await sendOTPViaSMS(restaurant.contact_number, otp, "password-reset");
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
    const restaurant = await RestaurantReg.findOne({ 
      where: isEmail ? { contact_email: emailOrMobile } : { contact_number: emailOrMobile }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!restaurant.otp) {
      return res.status(400).json({ success: false, message: "No OTP found" });
    }

    if (new Date() > restaurant.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (restaurant.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await restaurant.update({ otp: null, otpExpiry: null, otpVerified: true });

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
    const restaurant = await RestaurantReg.findOne({ 
      where: isEmail ? { contact_email: emailOrMobile } : { contact_number: emailOrMobile }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!restaurant.otpVerified) {
      return res.status(403).json({ success: false, message: "Please verify OTP first" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await restaurant.update({ password: hashedPassword, otpVerified: false });

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
    const restaurant = await RestaurantReg.findOne({ 
      where: isEmail ? { contact_email: emailOrMobile } : { contact_number: emailOrMobile }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: isEmail ? "Email not registered" : "Mobile not registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    
    await restaurant.update({ otp, otpExpiry });

    // Send OTP via AWS SNS
    if (ENABLE_SMS && !isEmail) {
      try {
        await sendOTPViaSMS(restaurant.contact_number, otp, "password-reset");
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