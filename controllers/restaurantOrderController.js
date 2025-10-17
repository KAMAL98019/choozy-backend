// controllers/restaurantOrderController.js
const { Order, OrderItem, User, Partner, FoodItem,  DeliveryOrder, RestaurantReg } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { autoAssignPartner } = require('./order.controller'); // adjust path if needed


// -------------------- Get all orders --------------------
async function getAllOrders(req, res) {
  try {
    const { restaurantId, status, sortBy = 'createdAt', order = 'DESC', search, userId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const where = { rest_id: restaurantId };

    // Status mapping
    if (status) {
      const map = {
        New: 'PENDING',
        Preparing: 'PREPARING',
        Ready: 'READY',
        Completed: 'DELIVERED',
        Cancelled: 'CANCELLED'
      };
      if (map[status]) where.status = map[status];
    }

    // Partner filter
    if (userId) {
      const user = await User.findByPk(userId);
      if (user?.role === 'PARTNER') where.partnerId = user.partnerId;
    }

    // Search filter
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } }
      ];
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        {
          model: OrderItem,
          as: 'items',
          include: [
            { model: FoodItem, as: 'food', attributes: ['id', 'dishname', 'price'], include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_logo'] }] }
          ]
        },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'address'] }
      ],
      order: [[sortBy, order]]
    });

    return res.status(200).json({ success: true, data: { orders, total: orders.length } });
  } catch (err) {
    console.error('Error in getAllOrders:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// -------------------- Get order by ID --------------------
async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: FoodItem, as: 'food', attributes: ['id', 'dishname', 'price'], include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_logo'] }] }] },
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'address'] }
      ]
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    console.error('Error in getOrderById:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function acceptOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estimatedPreparationTime, restaurantId } = req.body;

    if (!restaurantId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    // Fetch the order with transaction lock
    const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.rest_id !== restaurantId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Cannot accept order for another restaurant' });
    }

    if (order.status === 'CONFIRMED') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order is already accepted' });
    }
    if (order.status === 'CANCELLED') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot accept a rejected order' });
    }

    if (order.paymentStatus !== 'PAID') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot accept order. Payment not confirmed.' });
    }

    // Update order status and estimated time
    const newEstimatedTime = (order.estimatedPreparationTime || 0) + (Number(estimatedPreparationTime) || 0);
    await order.update(
      {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        estimatedPreparationTime: newEstimatedTime
      },
      { transaction: t }
    );

    // 🔹 AUTO-ASSIGN DELIVERY PARTNER
    const deliveryAssignment = await autoAssignPartner(order.id, t);

    let deliveryWithPartner = null;

    if (deliveryAssignment) {
      deliveryWithPartner = await DeliveryOrder.findOne({
        where: { id: deliveryAssignment.id },
        include: [
          {
            model: Partner,
            as: 'partner',
            attributes: ['id', 'fullName', 'mobile', 'status', 'address']
          }
        ],
        transaction: t
      });
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Order accepted',
      data: {
        order,
        delivery: deliveryWithPartner
      }
    });

  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error('Error in acceptOrder:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}



async function rejectOrder(req, res) {
  try {
    const { id } = req.params;
    const { reason, restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Ensure restaurant owns this order
    if (order.rest_id !== restaurantId) {
      return res.status(403).json({ success: false, message: 'Cannot reject order for another restaurant' });
    }

    // Check current status
    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Order is already rejected' });
    }
    if (order.status === 'CONFIRMED') {
      return res.status(400).json({ success: false, message: 'Cannot reject an accepted order' });
    }

    await order.update({
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason || 'Rejected by restaurant'
    });

    return res.status(200).json({ success: true, message: 'Order rejected', data: order });
  } catch (err) {
    console.error('Error in rejectOrder:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}


// -------------------- Update order status --------------------
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, restaurantId, additionalPreparationTime } = req.body; // Add optional additionalPreparationTime

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.rest_id !== restaurantId) {
      return res.status(403).json({ success: false, message: 'Cannot update order status for another restaurant' });
    }

    const timestampMap = {
      CONFIRMED: 'confirmedAt',
      PREPARING: 'preparingAt',
      READY: 'readyAt',
      OUT_FOR_DELIVERY: 'outForDeliveryAt',
      DELIVERED: 'deliveredAt',
      CANCELLED: 'cancelledAt'
    };

    const updateData = { status };
    if (timestampMap[status]) updateData[timestampMap[status]] = new Date();

    // Add additionalPreparationTime to existing estimatedPreparationTime
    if (additionalPreparationTime) {
      updateData.estimatedPreparationTime = (order.estimatedPreparationTime || 0) + Number(additionalPreparationTime);
    }

    await order.update(updateData);

    return res.status(200).json({ success: true, message: 'Order status updated', data: order });
  } catch (err) {
    console.error('Error in updateOrderStatus:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}


// -------------------- Print KOT --------------------
async function printKOT(req, res) {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: FoodItem, as: 'food', attributes: ['dishname'] }] }
      ]
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const kotData = {
      orderNumber: order.orderNumber,
      timestamp: order.createdAt,
      items: order.items.map(i => ({ name: i.food?.dishname, quantity: i.quantity })),
      specialInstructions: order.specialInstructions
    };

    return res.status(200).json({ success: true, data: kotData });
  } catch (err) {
    console.error('Error in printKOT:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// -------------------- Track Order --------------------
async function trackOrder(req, res) {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: FoodItem, as: 'food', attributes: ['dishname'] }] },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'address'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile'] }
      ]
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const tracking = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customer: { name: order.customerName || order.user?.name, phone: order.customerPhone || order.user?.mobile, address: order.address },
      partner: order.partner ? { name: order.partner.fullName, phone: order.partner.mobile, address: order.partner.address } : null,
      items: order.items.map(i => ({ name: i.food?.dishname, quantity: i.quantity })),
      timestamps: {
        confirmedAt: order.confirmedAt,
        preparingAt: order.preparingAt,
        readyAt: order.readyAt,
        outForDeliveryAt: order.outForDeliveryAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt
      }
    };

    return res.status(200).json({ success: true, data: tracking });
  } catch (err) {
    console.error('Error in trackOrder:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAllOrders,
  getOrderHistory: getAllOrders,
  getOrderById,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  printKOT,
  trackOrder
};
