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
const { sendSMS } = require('../utils/aws');

// ------------------- Multer Setup for Delivery Photo -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '..', 'uploads', 'delivery');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (err) {
      console.error('❌ Failed to create upload path:', err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
exports.uploadDeliveryPhoto = upload.single('deliveryPhoto');

// ------------------- Get Orders -------------------
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

// ------------------- Get Order by ID -------------------
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

// ------------------- AUTO-ASSIGN Partner -------------------
const autoAssignPartner = async (orderId, transaction) => {
  try {
    // Fetch order with restaurant
    const order = await Order.findByPk(orderId, {
      include: [{ model: RestaurantReg, as: 'restaurant' }],
      transaction
    });
    if (!order) throw new Error('Order not found');

    const restaurant = order.restaurant;
    if (!restaurant) throw new Error('Restaurant not found');

    // Get online partners
    const onlineAttendances = await PartnerAttendance.findAll({
      where: { status: 'ONLINE' },
      attributes: ['partnerId'],
      order: [['attendanceTime','DESC']],
      transaction
    });
    if (!onlineAttendances.length) {
      console.log('No partners online');
      return null;
    }

    const onlinePartnerIds = [...new Set(onlineAttendances.map(a => a.partnerId))];

    // Exclude busy partners
    const busyPartners = await DeliveryOrder.findAll({
      where: {
        partnerId: onlinePartnerIds,
        status: { [Op.in]: ['PENDING', 'ACCEPTED', 'PICKED_UP'] }
      },
      attributes: ['partnerId'],
      transaction
    });
    const busyPartnerIds = busyPartners.map(d => d.partnerId);
    let availablePartnerIds = onlinePartnerIds.filter(id => !busyPartnerIds.includes(id));
    if (!availablePartnerIds.length) {
      console.log('All online partners are busy');
      return null;
    }

    // Filter active partners
    const activePartners = await Partner.findAll({
      where: { id: { [Op.in]: availablePartnerIds }, status: 'active' },
      transaction
    });
    if (!activePartners.length) {
      console.log('No active partners available');
      return null;
    }

    // Apply RADIUS filter
    let filteredPartners = [...activePartners];
    if (restaurant.deliveryType === 'RADIUS' && restaurant.deliveryRadius && restaurant.restaurantLatitude && restaurant.restaurantLongitude) {
      filteredPartners = activePartners.filter(partner => {
        if (!partner.latitude || !partner.longitude) return false;
        const distance = geolib.getDistance(
          { latitude: restaurant.restaurantLatitude, longitude: restaurant.restaurantLongitude },
          { latitude: partner.latitude, longitude: partner.longitude }
        ) / 1000;
        return distance <= restaurant.deliveryRadius;
      });
    }

    // Apply ZONE filter
    if (restaurant.deliveryType === 'ZONE' && restaurant.deliveryZones && restaurant.deliveryZones.length) {
      filteredPartners = filteredPartners.filter(partner => {
        if (!partner.latitude || !partner.longitude) return false;
        return geolib.isPointInPolygon(
          { latitude: partner.latitude, longitude: partner.longitude },
          restaurant.deliveryZones
        );
      });
    }

    if (!filteredPartners.length) {
      console.log('No partners available after radius/zone filter');
      return null;
    }

    // Select the first available partner
    const selectedPartner = filteredPartners[0];

    // Generate delivery OTP
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await order.update({ deliveryOtp }, { transaction });

    // Create DeliveryOrder
    const delivery = await DeliveryOrder.create({
      orderId: order.id,
      partnerId: selectedPartner.id,
      status: 'ASSIGNED',
      pickupLatitude: restaurant.restaurantLatitude || null,
      pickupLongitude: restaurant.restaurantLongitude || null,
      deliveryLatitude: order.latitude || null,
      deliveryLongitude: order.longitude || null
    }, { transaction });

    // Include partner info before returning
    const deliveryWithPartner = await DeliveryOrder.findByPk(delivery.id, {
      include: [{ model: Partner, as: 'partner', attributes: ['id','fullName','mobile','status','latitude','longitude'] }],
      transaction
    });

    return deliveryWithPartner;

  } catch (err) {
    console.error('❌ Error in autoAssignPartner:', err);
    return null;
  }
};

exports.autoAssignPartner = autoAssignPartner;

// ------------------- Get New Delivery Requests -------------------
exports.getNewDeliveryRequests = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID is required' });

    const attendance = await PartnerAttendance.findOne({
      where: { partnerId, status: 'ONLINE' },
      order: [['attendanceTime','DESC']]
    });
    if (!attendance) return res.status(403).json({ success: false, message: 'You must be online to receive delivery requests' });

    const deliveries = await DeliveryOrder.findAll({
      where: { partnerId, status: { [Op.in]: ['ASSIGNED','PICKED_UP'] } },
      include: [{
        model: Order,
        as: 'order',
        include: [
          { model: RestaurantReg, as: 'restaurant', attributes: ['id','rest_name','contact_email','restaurantLatitude','restaurantLongitude','rest_address','contact_number'] },
          { model: User, as: 'user', attributes: ['id','name','mobile','email'] }
        ]
      }],
      order: [['createdAt','DESC']]
    });

    const formatted = deliveries.map(d => ({ ...d.toJSON(), isNew: d.status === 'ASSIGNED' }));
    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error in getNewDeliveryRequests:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------- ACCEPT DELIVERY -------------------
exports.acceptDelivery = async (req, res) => {
  try {
    const { deliveryId, partnerId } = req.body;
    if (!deliveryId || !partnerId) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { include: [{ model: Order, as: 'order' }] });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    if (delivery.status !== 'ASSIGNED') return res.status(400).json({ success: false, message: 'Already accepted or not available' });

    await delivery.update({ status: 'ACCEPTED' });
    await delivery.order.update({ status: 'ACCEPTED' });

    return res.json({ success: true, message: 'Delivery accepted successfully', data: delivery });
  } catch (err) {
    console.error('Error in acceptDelivery:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- REJECT DELIVERY -------------------
exports.rejectDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.body;
    if (!deliveryId) return res.status(400).json({ success: false, message: 'Delivery ID required' });

    const delivery = await DeliveryOrder.findByPk(deliveryId);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    await delivery.update({ status: 'REJECTED' });
    return res.json({ success: true, message: 'Delivery rejected' });
  } catch (err) {
    console.error('Error in rejectDelivery:', err);
    return res.status(500).json({ success: false, message: err.message });
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

    return res.json({ success: true, message: 'Order marked as picked up' });
  } catch (err) {
    console.error('Error in markPickedUp:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- VERIFY DELIVERY OTP -------------------
exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { deliveryId, otp } = req.body;
    if (!deliveryId || !otp) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const delivery = await DeliveryOrder.findByPk(deliveryId, { include: [{ model: Order, as: 'order' }] });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });

    if (delivery.order.deliveryOtp !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP' });

    await sequelize.transaction(async (t) => {
      await delivery.update({ status: 'DELIVERED' }, { transaction: t });
      await delivery.order.update({ status: 'DELIVERED' }, { transaction: t });

      await Earnings.create({
        partnerId: delivery.partnerId,
        orderId: delivery.orderId,
        amount: delivery.order.deliveryCharge || 0,
        type: 'DELIVERY',
        status: 'COMPLETED'
      }, { transaction: t });
    });

    return res.json({ success: true, message: 'Order delivered successfully' });
  } catch (err) {
    console.error('Error in verifyDeliveryOtp:', err);
    return res.status(500).json({ success: false, message: err.message });
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
    return res.json({ success: true, message: 'Proof photo uploaded', photoUrl });
  } catch (err) {
    console.error('Error in uploadDeliveryProof:', err);
    return res.status(500).json({ success: false, message: err.message });
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
    if (!delivery) return res.json({ success: true, data: null });

    return res.json({ success: true, data: delivery });
  } catch (err) {
    console.error('Error in getCurrentDelivery:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- DELIVERY HISTORY -------------------
exports.getDeliveryHistory = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID required' });

    const history = await DeliveryOrder.findAll({
      where: { partnerId, status: 'DELIVERED' },
      include: [
        { model: Order, as: 'order', include: [{ model: User, as: 'user' }, { model: RestaurantReg, as: 'restaurant' }] }
      ],
      order: [['createdAt','DESC']]
    });

    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('Error in getDeliveryHistory:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
