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
} = require('../../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const geolib = require('geolib');   

// ------------------- Logger for missing restaurant -------------------
const logMissingRestaurant = async (orderId) => {
  try {
    const logPath = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logPath)) fs.mkdirSync(logPath, { recursive: true });
    
    const logFile = path.join(logPath, 'missing_restaurant.log');
    const logEntry = `[${new Date().toISOString()}] Order ${orderId} missing rest_id\n`;
    fs.appendFileSync(logFile, logEntry);
    console.warn(`⚠️ Logged missing restaurant for Order ${orderId}`);
  } catch (err) {
    console.error('❌ Failed to log missing restaurant:', err);
  }
};

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

    // 1️⃣ Fetch order with user
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }],
      transaction
    });
    if (!order) return null;

    if (!order.rest_id) {
      await logMissingRestaurant(order.id);
      return null;
    }

    const restaurant = await RestaurantReg.findByPk(order.rest_id, { transaction });
    if (!restaurant) return null;

    // 2️⃣ Get online partners
    let onlineAttendances = await PartnerAttendance.findAll({
      where: { status: 'ONLINE' },
      attributes: ['partnerId'],
      order: [['attendanceTime','DESC']],
      transaction
    });
    if (!onlineAttendances.length) return null;

    let onlinePartnerIds = [...new Set(onlineAttendances.map(a => a.partnerId))];
    if (excludePartnerId) onlinePartnerIds = onlinePartnerIds.filter(id => id !== excludePartnerId);

    // 3️⃣ Exclude busy partners
    const busyPartners = await DeliveryOrder.findAll({
      where: {
        partnerId: onlinePartnerIds,
        status: { [Op.in]: ['ASSIGNED','ACCEPTED','PICKED_UP'] }
      },
      attributes: ['partnerId'],
      transaction
    });
    const busyPartnerIds = busyPartners.map(d => d.partnerId);
    let availablePartnerIds = onlinePartnerIds.filter(id => !busyPartnerIds.includes(id));
    if (!availablePartnerIds.length) return null;

    // 4️⃣ Active partners
    let activePartners = await Partner.findAll({
      where: { id: { [Op.in]: availablePartnerIds }, status: 'active' },
      transaction
    });
    if (!activePartners.length) return null;

    // 5️⃣ Radius filter
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

    // 6️⃣ Zone filter
    if (restaurant.deliveryType === 'ZONE' && restaurant.deliveryZones) {
      let zones = restaurant.deliveryZones;
      if (typeof zones === 'string') {
        try { zones = JSON.parse(zones); } catch { zones = []; }
      }
      filteredPartners = filteredPartners.filter(partner => {
        if (!partner.latitude || !partner.longitude) return false;
        return geolib.isPointInPolygon(
          { latitude: partner.latitude, longitude: partner.longitude },
          zones
        );
      });
    }

    if (!filteredPartners.length) return null;

    // 7️⃣ Select first partner
    const selectedPartner = filteredPartners[0];

    // 8️⃣ Generate OTP for user and save in user table
    const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    if (order.user) {
      await order.user.update({ otp: deliveryOtp, otpExpiry, otpVerified: false }, { transaction });
    }

    // 9️⃣ Create delivery order
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

// ------------------- DELIVERY REQUESTS -------------------
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
          { model: RestaurantReg, as: 'restaurant' }, 
          { model: User, as: 'user' }
        ] 
      }],
      order: [['createdAt','DESC']]
    });

    const formatted = deliveries.map(d => ({ 
      ...d.toJSON(), 
      isNew: d.status === 'ASSIGNED' 
    }));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error('Error in getNewDeliveryRequests:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- ACCEPT DELIVERY (FIXED) -------------------
exports.acceptDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId } = req.body;
    
    // Validate required fields
    if (!deliveryId || !partnerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'deliveryId and partnerId are required' });
    }

    // Parse UUID if needed
    const cleanDeliveryId = String(deliveryId).trim();
    const cleanPartnerId = String(partnerId).trim();

    // Check if partner is online
    const partnerOnline = await PartnerAttendance.findOne({ 
      where: { partnerId: cleanPartnerId, status: 'ONLINE' },
      transaction: t 
    });
    if (!partnerOnline) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Partner is not online' });
    }

    // Fetch delivery with order and restaurant details
    const delivery = await DeliveryOrder.findByPk(cleanDeliveryId, { 
      include: [{ 
        model: Order, 
        as: 'order',
        include: [{ 
          model: RestaurantReg, 
          as: 'restaurant',
          attributes: ['id', 'rest_name'] 
        }]
      }], 
      transaction: t 
    });
    
    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Check if delivery is assigned to this partner
    if (delivery.partnerId !== cleanPartnerId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'This delivery is not assigned to you' });
    }

    // Check if delivery is in correct status
    if (delivery.status !== 'ASSIGNED') {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Delivery is in ${delivery.status} status. Can only accept ASSIGNED deliveries.` 
      });
    }

    // Log missing restaurant but do NOT block the operation
    if (!delivery.order?.rest_id) {
      await logMissingRestaurant(delivery.order?.id);
      console.warn(`⚠️ Order ${delivery.orderId} missing rest_id`);
    }

    // Update delivery status to ACCEPTED (using plain value)
    await delivery.update({ 
      status: 'ACCEPTED',
      acceptedAt: new Date()
    }, { transaction: t });

    // Update order status if order exists
    if (delivery.order) {
      await delivery.order.update({ 
        status: 'ACCEPTED',
        partnerId: cleanPartnerId
      }, { transaction: t });
    }

    await t.commit();

    // Fetch updated delivery with all relations for response
    const updatedDelivery = await DeliveryOrder.findByPk(cleanDeliveryId, {
      include: [
        { 
          model: Order, 
          as: 'order',
          include: [
            { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'restaurantLatitude', 'restaurantLongitude'] },
            { model: User, as: 'user', attributes: ['id', 'name', 'mobile'] }
          ]
        },
        { 
          model: Partner, 
          as: 'partner',
          attributes: ['id', 'fullName', 'mobile', 'status']
        }
      ]
    });

    res.status(200).json({ 
      success: true, 
      message: 'Delivery accepted successfully', 
      data: updatedDelivery
    });

  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('❌ Error in acceptDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- REJECT DELIVERY -------------------
exports.rejectDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId, reason } = req.body;
    if (!deliveryId || !partnerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'deliveryId and partnerId are required' });
    }

    const delivery = await DeliveryOrder.findByPk(deliveryId, { 
      include: [{ model: Order, as: 'order' }], 
      transaction: t 
    });
    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.partnerId !== partnerId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'You cannot reject a delivery not assigned to you' });
    }

    if (delivery.status !== 'ASSIGNED') {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Cannot reject delivery in ${delivery.status} status` 
      });
    }

    // Log missing restaurant but do NOT block
    if (!delivery.order?.rest_id) {
      await logMissingRestaurant(delivery.order?.id);
    }

    await delivery.update({ 
      status: 'REJECTED', 
      rejectionReason: reason || null 
    }, { transaction: t });

    // Auto reassign to another partner
    const reassignedDelivery = await autoAssignPartner(delivery.orderId, t, partnerId);

    await t.commit();
    res.status(200).json({ 
      success: true, 
      message: 'Delivery rejected and reassigned successfully', 
      data: reassignedDelivery 
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('❌ Error in rejectDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- MARK PICKED UP -------------------
exports.markPickedUp = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId } = req.body;
    if (!deliveryId || !partnerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'deliveryId and partnerId are required' });
    }

    const delivery = await DeliveryOrder.findByPk(deliveryId, { 
      include: [{ model: Order, as: 'order' }], 
      transaction: t 
    });
    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.partnerId !== partnerId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized partner' });
    }

    // Log missing restaurant but do NOT block
    if (!delivery.order?.rest_id) {
      await logMissingRestaurant(delivery.order?.id);
    }

    if (delivery.status !== 'ACCEPTED') {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Order must be ACCEPTED before pickup. Current status: ${delivery.status}` 
      });
    }

    await delivery.update({ 
      status: 'PICKED_UP',
      pickedUpAt: new Date()
    }, { transaction: t });
    
    if (delivery.order) {
      await delivery.order.update({ status: 'OUT_FOR_DELIVERY' }, { transaction: t });
    }

    await t.commit();
    
    const updatedDelivery = await DeliveryOrder.findByPk(deliveryId, {
      include: [
        { model: Order, as: 'order' },
        { model: Partner, as: 'partner', attributes: ['id','fullName','mobile'] }
      ]
    });
    
    res.json({ 
      success: true, 
      message: 'Order marked as picked up successfully', 
      data: updatedDelivery 
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('Error in markPickedUp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- VERIFY DELIVERY OTP -------------------
exports.verifyDeliveryOtp = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId, otp } = req.body;

    if (!deliveryId || !partnerId || !otp) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'deliveryId, partnerId, and otp are required' });
    }

    // 1️⃣ Fetch delivery with order and user
    const delivery = await DeliveryOrder.findByPk(deliveryId, {
      include: [{ model: Order, as: 'order', include: [{ model: User, as: 'user' }] }],
      transaction: t
    });

    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // 2️⃣ Check if assigned partner is correct
    if (delivery.partnerId !== partnerId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized partner' });
    }

    // 3️⃣ Ensure delivery is picked up before verifying OTP
    if (delivery.status !== 'PICKED_UP') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Order must be PICKED_UP before delivery. Current status: ${delivery.status}`
      });
    }

    // 4️⃣ Check user OTP
    const user = delivery.order.user;
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.otp || String(user.otp).trim() !== String(otp).trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // 5️⃣ Check OTP expiry
    if (user.otpExpiry && new Date() > user.otpExpiry) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // 6️⃣ Mark OTP verified and clear it
    await user.update({ otpVerified: true, otp: null, otpExpiry: null }, { transaction: t });

    // 7️⃣ Update delivery & order status
    await delivery.update({ status: 'DELIVERED', deliveredAt: new Date() }, { transaction: t });
    await delivery.order.update({ status: 'DELIVERED', deliveredAt: new Date() }, { transaction: t });

    // 8️⃣ Record partner earnings
    await Earnings.create({
      partnerId,
      orderId: delivery.orderId,
      amount: delivery.order.deliveryCharge || 0,
      type: 'DELIVERY',
      status: 'COMPLETED'
    }, { transaction: t });

    await t.commit();

    // 9️⃣ Fetch updated delivery for response
    const updatedDelivery = await DeliveryOrder.findByPk(deliveryId, {
      include: [
        { model: Order, as: 'order', include: [{ model: User, as: 'user', attributes: ['id','name','mobile'] }] },
        { model: Partner, as: 'partner', attributes: ['id','fullName','mobile'] }
      ]
    });

    res.json({
      success: true,
      message: 'Order delivered successfully',
      data: updatedDelivery
    });

  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('Error in verifyDeliveryOtp:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- UPLOAD DELIVERY PROOF -------------------
exports.uploadDeliveryProof = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deliveryId, partnerId } = req.body;
    if (!deliveryId || !partnerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'deliveryId and partnerId are required' });
    }

    if (!req.file) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Proof photo is required' });
    }

    const delivery = await DeliveryOrder.findByPk(deliveryId, { transaction: t });
    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.partnerId !== partnerId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized partner' });
    }

    const photoUrl = `/uploads/delivery/${req.file.filename}`;
    await delivery.update({ deliveryPhoto: photoUrl }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Proof photo uploaded successfully', photoUrl });
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('Error in uploadDeliveryProof:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------- CURRENT DELIVERY -------------------
exports.getCurrentDelivery = async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ success: false, message: 'Partner ID required' });

    const delivery = await DeliveryOrder.findOne({
      where: { partnerId, status: { [Op.in]: ['ASSIGNED','ACCEPTED','PICKED_UP'] } },
      include: [
        { model: Order, as: 'order', include: [
            { model: User, as: 'user', attributes: ['id','name','mobile'] },
            { model: RestaurantReg, as: 'restaurant', attributes: ['id','rest_name','restaurantLatitude','restaurantLongitude'] }
        ]}
      ],
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, data: delivery || null });
  } catch (err) {
    console.error('Error in getCurrentDelivery:', err);
    res.status(500).json({ success: false, message: err.message });
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
        { model: Order, as: 'order', include: [
            { model: User, as: 'user', attributes: ['id','name','mobile'] },
            { model: RestaurantReg, as: 'restaurant', attributes: ['id','rest_name','restaurantLatitude','restaurantLongitude'] }
        ]}
      ],
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    console.error('Error in getDeliveryHistory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};