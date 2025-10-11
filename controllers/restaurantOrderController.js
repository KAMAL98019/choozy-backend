// controllers/restaurantOrderController.js
const { Order, OrderItem, User, Partner, FoodItem, RestaurantReg } = require('../models');
const { Op } = require('sequelize');



async function getAllOrders(req, res) {
  try {
    const { restaurantId, status, sortBy = 'createdAt', order = 'DESC', search, userId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'restaurantId is required' });
    }

    const where = { rest_id: restaurantId }; // ✅ use correct attribute

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

    // If partner user
    if (userId) {
      const user = await User.findByPk(userId);
      if (user?.role === 'PARTNER') {
        where.partnerId = user.partnerId;
      }
    }

    // Search by orderNumber / customerName
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
            {
              model: FoodItem,
              as: 'food',
              attributes: ['id', 'dishname', 'price'],
              include: [
                { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_logo'] }
              ]
            }
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
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: FoodItem,
              as: 'food',
              attributes: ['id', 'dishname', 'price'],
              include: [{ model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'rest_logo'] }]
            }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'address'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    console.error('Error in getOrderById:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// -------------------- Accept order --------------------
async function acceptOrder(req, res) {
  try {
    const { id } = req.params;
    const { estimatedPreparationTime } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await order.update({
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      estimatedPreparationTime: estimatedPreparationTime || 15
    });

    return res.status(200).json({ success: true, message: 'Order accepted', data: order });
  } catch (err) {
    console.error('Error in acceptOrder:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// -------------------- Reject order --------------------
async function rejectOrder(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

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
    const { status } = req.body;

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

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
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food', attributes: ['dishname'] }]
        }
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
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food', attributes: ['dishname'] }]
        },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'address'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile'] }
      ]
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const tracking = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customer: {
        name: order.customerName || order.user?.name,
        phone: order.customerPhone || order.user?.mobile,
        address: order.address
      },
      partner: order.partner
        ? { name: order.partner.fullName, phone: order.partner.mobile, address: order.partner.address }
        : null,
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
  getOrderHistory: getAllOrders, // reuse
  getOrderById,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  printKOT,
  trackOrder
};
