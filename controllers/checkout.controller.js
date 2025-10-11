const { sequelize, Cart, CartItem, FoodItem, Order, OrderItem, RestaurantReg, User } = require('../models');

exports.checkout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, cartId, rest_id, address, paymentMethod, customerLat, customerLng } = req.body;

    // Validate required fields
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

    // ✅ Fetch restaurant for delivery settings
    const restaurant = await RestaurantReg.findByPk(rest_id, { transaction: t });
    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate subtotal & prepare items
    let subtotal = 0;
    const orderItemsData = [];
    for (const item of cart.items) {
      let addOns = [];
      if (item.selectedAddOns) {
        if (typeof item.selectedAddOns === 'string') {
          try { addOns = JSON.parse(item.selectedAddOns); } catch { addOns = []; }
        } else if (Array.isArray(item.selectedAddOns)) {
          addOns = item.selectedAddOns;
        }
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

    // ✅ Delivery Fee Logic
    let deliveryFee = 0;

    if (subtotal >= restaurant.minOrderAmount) {
      deliveryFee = 0; // Free delivery above min order
    } else {
      deliveryFee = Number(restaurant.baseDeliveryFee || 50);
    }

    // 🔹 Optional: Check if customer is inside delivery zone/radius
    if (restaurant.deliveryType === 'RADIUS' && customerLat && customerLng) {
      const distance = haversineDistance(
        [restaurant.restaurantLatitude, restaurant.restaurantLongitude],
        [customerLat, customerLng]
      );

      if (distance > restaurant.deliveryRadius) {
        await t.rollback();
        return res.status(400).json({ error: 'Customer location is outside delivery radius' });
      }
    }

    if (restaurant.deliveryType === 'ZONE' && customerLat && customerLng) {
      if (!isPointInPolygon([customerLat, customerLng], restaurant.deliveryZones)) {
        await t.rollback();
        return res.status(400).json({ error: 'Customer location is outside delivery zone' });
      }
    }

    const totalAmount = +(subtotal + tax + deliveryFee).toFixed(2);

    // Create Order
    const order = await Order.create(
      {
        userId,
        cartId,
        rest_id,
        address,
        paymentMethod,
        subtotal,
        tax,
        deliveryFee,
        totalAmount,
        status: 'PENDING'
      },
      { transaction: t }
    );

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

    const user = await User.findByPk(userId, { transaction: t });

    await t.commit();

    // Response
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
        status: order.status
      }
    });
  } catch (err) {
    console.error('Checkout Error:', err);
    if (!t.finished) await t.rollback();
    return res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
};

// ✅ Helper Functions
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isPointInPolygon(point, polygon) {
  let [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].lat, yi = polygon[i].lng;
    let xj = polygon[j].lat, yj = polygon[j].lng;

    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }
  return inside;
}
