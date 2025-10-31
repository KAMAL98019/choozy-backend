const { sequelize, Cart, CartItem, FoodItem, Order, OrderItem, RestaurantReg, User } = require('../models');

exports.checkout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, cartId, rest_id, address, paymentMethod, customerLat, customerLng } = req.body;

    if (!userId || !cartId || !rest_id || !address || !paymentMethod) {
      await t.rollback();
      return res.status(400).json({ error: 'userId, cartId, rest_id, address & paymentMethod are required' });
    }

    // Fetch cart
    const cart = await Cart.findOne({
      where: { id: cartId, userId, status: 'active' },
      include: [{ model: CartItem, as: 'items', include: [{ model: FoodItem, as: 'food' }] }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!cart || cart.items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Cart is empty or already checked out' });
    }

    // Validate stock
    for (const item of cart.items) {
      if (item.quantity > item.food.stock) {
        await t.rollback();
        return res.status(400).json({
          error: `Not enough stock for ${item.food.dishname}, available: ${item.food.stock}`
        });
      }
    }

    // Fetch restaurant
    const restaurant = await RestaurantReg.findByPk(rest_id, { transaction: t });
    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate subtotal
    let subtotal = 0;
    const orderItemsData = [];
    for (const item of cart.items) {
      let addOns = [];
      if (item.selectedAddOns) {
        addOns = typeof item.selectedAddOns === 'string' ? JSON.parse(item.selectedAddOns) : item.selectedAddOns;
      }
      const addOnTotal = addOns.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const itemTotal = item.quantity * (Number(item.unitPrice) + addOnTotal);
      subtotal += itemTotal;

      orderItemsData.push({
        orderId: null,
        foodId: item.foodId,
        quantity: item.quantity,
        price: item.unitPrice,
        selectedAddOns: JSON.stringify(addOns),
        totalPrice: itemTotal,
        foodName: item.food.dishname
      });
    }

    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal >= restaurant.minOrderAmount ? 0 : Number(restaurant.baseDeliveryFee || 50);
    const totalAmount = +(subtotal + tax + deliveryFee).toFixed(2);

    // Check delivery radius / zone
    if (restaurant.deliveryType === 'RADIUS' && customerLat && customerLng) {
      const distance = geolib.getDistance(
        { latitude: restaurant.restaurantLatitude, longitude: restaurant.restaurantLongitude },
        { latitude: customerLat, longitude: customerLng }
      ) / 1000;
      if (distance > restaurant.deliveryRadius) {
        await t.rollback();
        return res.status(400).json({ error: 'Customer location is outside delivery radius' });
      }
    }

    if (restaurant.deliveryType === 'ZONE' && customerLat && customerLng) {
      let zones = restaurant.deliveryZones;
      if (typeof zones === 'string') zones = JSON.parse(zones);
      if (!geolib.isPointInPolygon({ latitude: customerLat, longitude: customerLng }, zones)) {
        await t.rollback();
        return res.status(400).json({ error: 'Customer location is outside delivery zone' });
      }
    }

    // Create order
    const order = await Order.create({
      userId,
      cartId,
      rest_id,
      address,
      paymentMethod,
      subtotal,
      tax,
      deliveryFee,
      totalAmount,
      status: 'PENDING',
      paymentStatus: 'PAID'
    }, { transaction: t });

    // Save order items
    orderItemsData.forEach(item => (item.orderId = order.id));
    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // Deduct stock
    for (const item of cart.items) {
      item.food.stock -= item.quantity;
      await item.food.save({ transaction: t });
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId }, transaction: t });
    await cart.update({ status: 'checked_out' }, { transaction: t });

    // Auto-assign partner
    const delivery = await autoAssignPartner(order.id, t);

    const user = await User.findByPk(userId, { transaction: t });
    await t.commit();

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        cartId,
        restaurant: {
          id: restaurant.id,
          name: restaurant.rest_name,
          address: restaurant.rest_address,
          phone: restaurant.contact_number
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.mobile
        },
        items: orderItemsData.map(i => ({
          foodId: i.foodId,
          foodName: i.foodName,
          quantity: i.quantity,
          price: i.price,
          selectedAddOns: JSON.parse(i.selectedAddOns),
          totalPrice: i.totalPrice
        })),
        subtotal,
        tax,
        deliveryFee,
        totalAmount,
        paymentMethod,
        status: order.status,
        paymentStatus: order.paymentStatus,
        delivery: delivery || null
      }
    });

  } catch (err) {
    console.error('Checkout Error:', err);
    if (!t.finished) await t.rollback();
    return res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
};


// controllers/order.controller.js

exports.trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: RestaurantReg,
          as: 'restaurant',
          attributes: ['id', 'rest_name', 'restaurantLatitude', 'restaurantLongitude', 'rest_address', 'contact_number']
        },
        {
          model: DeliveryOrder,
          as: 'delivery_order',
          include: [
            { model: Partner, as: 'partner', attributes: ['id', 'fullName', 'mobile', 'status'] }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Calculate remaining time
    let remainingTime = null;
    if (order.status === 'PREPARING' || order.status === 'READY') {
      remainingTime = order.estimatedPreparationTime || null; // in minutes
    }

    // Send tracking info
    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedPreparationTime: order.estimatedPreparationTime, // total estimated time
        remainingTime, // optionally remaining
        restaurant: order.restaurant,
        delivery: order.delivery_order ? {
          status: order.delivery_order.status,
          partner: order.delivery_order.partner,
          otp: order.delivery_order.status === 'PICKED_UP' ? order.deliveryOtp : null
        } : null
      }
    });

  } catch (err) {
    console.error('Error in trackOrder:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
