'use strict';

const { sequelize, Order, OrderItem, DeliveryOrder, Partner, RestaurantReg, User } = require('../models');

/**
 * Assign a delivery partner to an order.
 * - order must exist and be CONFIRMED
 * - partner must exist and be online
 * - sets DeliveryOrder with pickup/delivery coords
 */
exports.assignDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderId, partnerId } = req.body;
    if (!orderId || !partnerId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'orderId and partnerId are required' });
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: RestaurantReg, as: 'restaurant' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'CONFIRMED') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order not confirmed by restaurant yet.' });
    }

    const partner = await Partner.findByPk(partnerId, { transaction: t });
    if (!partner || partner.status !== 'online') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Partner not found or not online' });
    }

    // create assignment
    const delivery = await DeliveryOrder.create({
      orderId,
      partnerId,
      status: 'PENDING',
      pickupLatitude: order.restaurant?.restaurantLatitude || null,
      pickupLongitude: order.restaurant?.restaurantLongitude || null,
      deliveryLatitude: order.latitude || null,
      deliveryLongitude: order.longitude || null
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ success: true, message: 'Delivery partner assigned', data: delivery });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error('Error in assignDelivery:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Partner responds to assignment (ACCEPT / REJECT).
 * If REJECT, auto reassigns to next available partner (simple example).
 */
exports.respondToDelivery = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { assignmentId } = req.params;
    const { response } = req.body;
    if (!assignmentId || !response) {
      await t.rollback();
      return res.status(400).json({ message: 'assignmentId and response are required' });
    }

    const assignment = await DeliveryOrder.findByPk(assignmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!assignment) {
      await t.rollback();
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (response === 'ACCEPT') {
      assignment.status = 'ACCEPTED';
      assignment.acceptedAt = new Date();
      await assignment.save({ transaction: t });
      await t.commit();
      return res.json({ success: true, message: 'Assignment accepted', data: assignment });
    } else if (response === 'REJECT') {
      // mark current assignment rejected
      assignment.status = 'REJECTED';
      assignment.rejectedAt = new Date();
      await assignment.save({ transaction: t });

      // Try to find another partner (exclude this partner; simple fallback strategy)
      const alternate = await Partner.findOne({
        where: { status: 'online', id: { [sequelize.Op.ne]: assignment.partnerId } },
        order: [['id', 'ASC']],
        transaction: t
      });

      if (alternate) {
        const newAssign = await DeliveryOrder.create({
          orderId: assignment.orderId,
          partnerId: alternate.id,
          status: 'PENDING',
          pickupLatitude: assignment.pickupLatitude,
          pickupLongitude: assignment.pickupLongitude,
          deliveryLatitude: assignment.deliveryLatitude,
          deliveryLongitude: assignment.deliveryLongitude
        }, { transaction: t });

        await t.commit();
        return res.json({ success: true, message: 'Assignment rejected and re-assigned', data: newAssign });
      } else {
        // no alternate found
        await t.commit();
        return res.json({ success: true, message: 'Assignment rejected - no alternate partner available' });
      }
    } else {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid response. Use ACCEPT or REJECT' });
    }
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error('Error in respondToDelivery:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Partner updates delivery status (PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, etc).
 * If DELIVERED, update order.status to DELIVERED too.
 */
exports.updateDeliveryStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { assignmentId } = req.params;
    const { status, distanceKm } = req.body;
    if (!assignmentId || !status) {
      await t.rollback();
      return res.status(400).json({ message: 'assignmentId and status required' });
    }

    const delivery = await DeliveryOrder.findByPk(assignmentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!delivery) {
      await t.rollback();
      return res.status(404).json({ message: 'Delivery not found' });
    }

    delivery.status = status;
    if (distanceKm !== undefined) {
      delivery.distanceKm = distanceKm;
      delivery.earnings = Number(distanceKm) * 10; // example rate
    }

    if (status === 'DELIVERED') {
      delivery.deliveredAt = new Date();
      // also update order
      const order = await Order.findByPk(delivery.orderId, { transaction: t, lock: t.LOCK.UPDATE });
      if (order) {
        order.status = 'DELIVERED';
        order.deliveredAt = new Date();
        await order.save({ transaction: t });
      }
    }

    await delivery.save({ transaction: t });
    await t.commit();
    return res.json({ success: true, data: delivery });
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error('Error in updateDeliveryStatus:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get deliveries/orders for admin/partner use.
 * We return orders with items, partner and restaurant.
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: OrderItem, as: 'items', include: [{ model: sequelize.models.FoodItem, as: 'food' }] },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'restaurantLatitude', 'restaurantLongitude'] },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
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
        { model: OrderItem, as: 'items', include: [{ model: sequelize.models.FoodItem, as: 'food' }] },
        { model: RestaurantReg, as: 'restaurant', attributes: ['id', 'rest_name', 'restaurantLatitude', 'restaurantLongitude'] },
        { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'mobile', 'email'] }
      ]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error in getOrder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
