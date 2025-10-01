const { Order, OrderItem, DeliveryOrder, Partner } = require('../models');


// ---------------- Restaurant: Accept/Reject Order ----------------
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (status === 'ACCEPTED') {
      order.status = 'CONFIRMED';
      await order.save();

      // ---------------- Auto-assign nearest available delivery partner ----------------
      const nearestPartner = await Partner.findOne({ where: { status: 'online' }, order: [['id','ASC']] });
      if (nearestPartner) {
        await DeliveryOrder.create({
          orderId: order.id,
          partnerId: nearestPartner.id,
          status: 'PENDING'
        });
      }

    } else if (status === 'REJECTED') {
      order.status = 'CANCELLED';
      await DeliveryOrder.destroy({ where: { orderId } });
      await order.save();
    } else {
      // optional: handle other status updates if needed
      order.status = status;
      await order.save();
    }

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Partner: Assign Delivery ----------------
exports.assignDelivery = async (req, res) => {
  try {
    const { orderId, partnerId } = req.body;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const delivery = await DeliveryOrder.create({
      orderId,
      partnerId,
      status: 'PENDING'
    });

    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Partner: Accept/Reject Assignment ----------------
exports.respondToDelivery = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { response } = req.body; // ACCEPT or REJECT

    const assignment = await DeliveryOrder.findByPk(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    if (response === 'ACCEPT') {
      assignment.status = 'ACCEPTED';
    } else if (response === 'REJECT') {
      assignment.status = 'REJECTED';

      // Auto-assign to nearest available partner (example: first online partner)
      const nearestPartner = await Partner.findOne({ where: { status: 'online' }, order: [['id', 'ASC']] });
      if (nearestPartner) {
        await DeliveryOrder.create({
          orderId: assignment.orderId,
          partnerId: nearestPartner.id,
          status: 'PENDING'
        });
      }
    }

    await assignment.save();
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Partner: Update Delivery Status & Earnings ----------------
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, distanceKm } = req.body;

    const delivery = await DeliveryOrder.findByPk(assignmentId);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    delivery.status = status;
    if (distanceKm) {
      delivery.distanceKm = distanceKm;
      delivery.earnings = distanceKm * 10; // ₹10 per km
    }

    await delivery.save();
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- Get Orders / Single Order ----------------
exports.getOrders = async (req, res) => {
  const orders = await Order.findAll({ include: ['items', 'cart'] });
  res.json(orders);
};

exports.getOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ['items', 'cart'] });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};
