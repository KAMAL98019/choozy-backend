// controllers/order.controller.js
const { 
  sequelize, 
  Order, 
  OrderItem,
  DeliveryOrder, 
  Partner, 
  RestaurantReg, 
  PartnerAttendance, 
  Earnings, 
  User 
} = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const geolib = require('geolib');

// ------------------- Multer Setup for Delivery Photo -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '..', 'uploads', 'delivery');
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error('❌ Failed to create upload path:', err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
exports.uploadDeliveryPhoto = upload.single('deliveryPhoto');

// ------------------- AUTO-ASSIGN PARTNER -------------------
const autoAssignPartner = async (orderId, transaction, excludePartnerId = null) => {
  try {
    console.log('🔹 Auto-assign partner start');

    const order = await Order.findByPk(orderId, { include: [{ model: RestaurantReg, as: 'restaurant' }], transaction });
    if (!order) throw new Error('Order not found');
    const restaurant = order.restaurant;
    if (!restaurant) throw new Error('Restaurant not found');

    // 1️⃣ Get online partners
    let onlineAttendances = await PartnerAttendance.findAll({
      where: { status: 'ONLINE' },
      attributes: ['partnerId'],
      order: [['attendanceTime','DESC']],
      transaction
    });
    if (!onlineAttendances.length) return null;

    let onlinePartnerIds = [...new Set(onlineAttendances.map(a => a.partnerId))];
    if (excludePartnerId) onlinePartnerIds = onlinePartnerIds.filter(id => id !== excludePartnerId);

    // 2️⃣ Exclude busy partners
    const busyPartners = await DeliveryOrder.findAll({
      where: {
        partnerId: onlinePartnerIds,
        status: { [Op.in]: ['PENDING','ACCEPTED','PICKED_UP'] }
      },
      attributes: ['partnerId'],
      transaction
    });
    const busyPartnerIds = busyPartners.map(d => d.partnerId);
    let availablePartnerIds = onlinePartnerIds.filter(id => !busyPartnerIds.includes(id));
    if (!availablePartnerIds.length) return null;

    // 3️⃣ Filter active partners
    let activePartners = await Partner.findAll({
      where: { id: { [Op.in]: availablePartnerIds }, status: 'active' },
      transaction
    });
    if (!activePartners.length) return null;

    // 4️⃣ Apply RADIUS filter
    let filteredPartners = [...activePartners];
    if (restaurant.deliveryType === 'RADIUS' && restaurant.deliveryRadius && restaurant.restaurantLatitude && restaurant.restaurantLongitude) {
      filteredPartners = filteredPartners.filter(partner => {
        if (!partner.latitude || !partner.longitude) return false;
        const distance = geolib.getDistance(
          { latitude: restaurant.restaurantLatitude, longitude: restaurant.restaurantLongitude },
          { latitude: partner.latitude, longitude: partner.longitude }
        ) / 1000;
        return distance <= restaurant.deliveryRadius;
      });
    }

    // 5️⃣ Apply ZONE filter
    if (restaurant.deliveryType === 'ZONE' && restaurant.deliveryZones && restaurant.deliveryZones.length) {
      filteredPartners = filteredPartners.filter(partner => {
        if (!partner.latitude || !partner.longitude) return false;
        return geolib.isPointInPolygon(
          { latitude: partner.latitude, longitude: partner.longitude },
          restaurant.deliveryZones
        );
      });
    }

    if (!filteredPartners.length) return null;

    // 6️⃣ Assign first partner
    const selectedPartner = filteredPartners[0];

    // 7️⃣ Generate delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await order.update({ deliveryOtp }, { transaction });

    // 8️⃣ Create delivery order
    const delivery = await DeliveryOrder.create({
      orderId: order.id,
      partnerId: selectedPartner.id,
      status: 'ASSIGNED',
      pickupLatitude: restaurant.restaurantLatitude || null,
      pickupLongitude: restaurant.restaurantLongitude || null,
      deliveryLatitude: order.latitude || null,
      deliveryLongitude: order.longitude || null
    }, { transaction });

    return await DeliveryOrder.findByPk(delivery.id, {
      include: [{ model: Partner, as: 'partner', attributes: ['id','fullName','mobile','status','latitude','longitude'] }],
      transaction
    });

  } catch (err) {
    console.error('❌ Error in autoAssignPartner:', err);
    return null;
  }
};
exports.autoAssignPartner = autoAssignPartner;

const autoAssignPartnerTest = async (orderId, transaction, excludePartnerId = null) => {
  try {
    console.log('🔹 Auto-assign partner (TEST MODE)');

    const order = await Order.findByPk(orderId, { include: [{ model: RestaurantReg, as: 'restaurant' }], transaction });
    if (!order) throw new Error('Order not found');

    // 1️⃣ Get online partners
    let onlineAttendances = await PartnerAttendance.findAll({
      where: { status: 'ONLINE' },
      attributes: ['partnerId'],
      order: [['attendanceTime','DESC']],
      transaction
    });
    if (!onlineAttendances.length) return null;

    let onlinePartnerIds = [...new Set(onlineAttendances.map(a => a.partnerId))];
    if (excludePartnerId) onlinePartnerIds = onlinePartnerIds.filter(id => id !== excludePartnerId);

    // 2️⃣ Exclude busy partners
    const busyPartners = await DeliveryOrder.findAll({
      where: {
        partnerId: onlinePartnerIds,
        status: { [Op.in]: ['PENDING','ACCEPTED','PICKED_UP'] }
      },
      attributes: ['partnerId'],
      transaction
    });
    const busyPartnerIds = busyPartners.map(d => d.partnerId);
    let availablePartnerIds = onlinePartnerIds.filter(id => !busyPartnerIds.includes(id));
    if (!availablePartnerIds.length) return null;

    // 3️⃣ Filter active partners
    let activePartners = await Partner.findAll({
      where: { id: { [Op.in]: availablePartnerIds }, status: 'active' },
      transaction
    });
    if (!activePartners.length) return null;

    // 4️⃣ Skip radius/zone filtering for test
    const selectedPartner = activePartners[0];

    // 5️⃣ Generate delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await order.update({ deliveryOtp }, { transaction });

    // 6️⃣ Create delivery order
    const delivery = await DeliveryOrder.create({
      orderId: order.id,
      partnerId: selectedPartner.id,
      status: 'ASSIGNED',
      pickupLatitude: order.restaurant.restaurantLatitude || null,
      pickupLongitude: order.restaurant.restaurantLongitude || null,
      deliveryLatitude: order.latitude || null,
      deliveryLongitude: order.longitude || null
    }, { transaction });

    return await DeliveryOrder.findByPk(delivery.id, {
      include: [{ model: Partner, as: 'partner', attributes: ['id','fullName','mobile','status'] }],
      transaction
    });

  } catch (err) {
    console.error('❌ Error in autoAssignPartnerTest:', err);
    return null;
  }
};

exports.autoAssignPartnerTest = autoAssignPartnerTest;


// ------------------- GET ORDERS -------------------
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, as: 'items' },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id','rest_name','restaurantLatitude','restaurantLongitude'] },
        { model: Partner, as: 'partner', attributes: ['id','fullName','mobile','status'] },
        { model: User, as: 'user', attributes: ['id','name','mobile','email'] }
      ],
      order: [['createdAt','DESC']]
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Error in getOrders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- GET ORDER BY ID -------------------
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id','rest_name','restaurantLatitude','restaurantLongitude'] },
        { model: Partner, as: 'partner', attributes: ['id','fullName','mobile'] },
        { model: User, as: 'user', attributes: ['id','name','mobile','email'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error in getOrder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- GET NEW DELIVERY REQUESTS -------------------
exports.getNewDeliveryRequests = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID is required' });

    const attendance = await PartnerAttendance.findOne({ where: { partnerId, status: 'ONLINE' }, order: [['attendanceTime','DESC']] });
    if (!attendance) return res.status(403).json({ success: false, message: 'You must be online to receive delivery requests' });

    const deliveries = await DeliveryOrder.findAll({
      where: { partnerId, status: { [Op.in]: ['ASSIGNED','PICKED_UP'] } },
      include: [{ model: Order, as: 'order', include: [{ model: RestaurantReg, as: 'restaurant' }, { model: User, as: 'user' }] }],
      order: [['createdAt','DESC']]
    });

    const formatted = deliveries.map(d => ({ ...d.toJSON(), isNew: d.status === 'ASSIGNED' }));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error in getNewDeliveryRequests:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- ACCEPT DELIVERY -------------------
exports.acceptDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId } = req.body;
    if (!deliveryId || !partnerId) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { include: [{ model: Order, as: 'order' }], transaction: t });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status !== 'ASSIGNED') return res.status(400).json({ success: false, message: 'Already accepted or not available' });

    await delivery.update({ status: 'ACCEPTED' }, { transaction: t });
    await delivery.order.update({ status: 'ACCEPTED' }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Delivery accepted successfully', data: delivery });
  } catch (err) {
    await t.rollback();
    console.error('Error in acceptDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- REJECT DELIVERY -------------------
exports.rejectDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ success: false, message: 'Delivery ID required' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { transaction: t });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    await delivery.update({ status: 'REJECTED' }, { transaction: t });

    // Auto-assign to another partner
    const newDelivery = await autoAssignPartner(delivery.orderId, t, delivery.partnerId);

    await t.commit();
    res.json({ success: true, message: 'Delivery rejected and reassigned', data: newDelivery });
  } catch (err) {
    await t.rollback();
    console.error('Error in rejectDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- MARK PICKED UP -------------------
exports.markPickedUp = async (req, res) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ success: false, message: 'Delivery ID required' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { include: [{ model: Order, as: 'order' }] });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    await delivery.update({ status: 'PICKED_UP' });
    await delivery.order.update({ status: 'OUT_FOR_DELIVERY' });

    res.json({ success: true, message: 'Order marked as picked up' });
  } catch (err) {
    console.error('Error in markPickedUp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- VERIFY DELIVERY OTP -------------------
exports.verifyDeliveryOtp = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, otp } = req.body;
    if (!deliveryId || !otp) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { include: [{ model: Order, as: 'order' }], transaction: t });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.order.deliveryOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    await delivery.update({ status: 'DELIVERED' }, { transaction: t });
    await delivery.order.update({ status: 'DELIVERED' }, { transaction: t });

    await Earnings.create({
      partnerId: delivery.partnerId,
      orderId: delivery.orderId,
      amount: delivery.order.deliveryCharge || 0,
      type: 'DELIVERY',
      status: 'COMPLETED'
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Order delivered successfully' });
  } catch (err) {
    await t.rollback();
    console.error('Error in verifyDeliveryOtp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- UPLOAD DELIVERY PROOF -------------------
exports.uploadDeliveryProof = async (req, res) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ success: false, message: 'Delivery ID required' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Proof photo is required' });

    const photoUrl = `/uploads/delivery/${req.file.filename}`;
    await DeliveryOrder.update({ proofPhoto: photoUrl }, { where: { id: deliveryId } });
    res.json({ success: true, message: 'Proof photo uploaded', photoUrl });
  } catch (err) {
    console.error('Error in uploadDeliveryProof:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- GET CURRENT DELIVERY -------------------
exports.getCurrentDelivery = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID required' });

    const delivery = await DeliveryOrder.findOne({
      where: { partnerId, status: { [Op.in]: ['ASSIGNED','ACCEPTED','PICKED_UP'] } },
      include: [{ model: Order, as: 'order', include: [{ model: User, as: 'user' }, { model: RestaurantReg, as: 'restaurant' }] }],
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, data: delivery || null });
  } catch (err) {
    console.error('Error in getCurrentDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- GET DELIVERY HISTORY -------------------
exports.getDeliveryHistory = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID required' });

    const history = await DeliveryOrder.findAll({
      where: { partnerId, status: 'DELIVERED' },
      include: [{ model: Order, as: 'order', include: [{ model: User, as: 'user' }, { model: RestaurantReg, as: 'restaurant' }] }],
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, data: history });
  } catch (err) {
    console.error('Error in getDeliveryHistory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
