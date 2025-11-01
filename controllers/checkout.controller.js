const { 
  sequelize, 
  Cart, 
  CartItem, 
  FoodItem, 
  Order, 
  OrderItem, 
  RestaurantReg, 
  User, 
  DeliveryOrder, 
  Partner 
} = require('../models');

// ------------------- Checkout -------------------
exports.checkout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, cartId, rest_id, address, paymentMethod, customerLat, customerLng } = req.body;

    if (!userId || !cartId || !rest_id || !address || !paymentMethod) {
      await t.rollback();
      return res.status(400).json({ error: 'userId, cartId, rest_id, address & paymentMethod are required' });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

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

    for (const item of cart.items) {
      if (item.quantity > item.food.stock) {
        await t.rollback();
        return res.status(400).json({
          error: `Not enough stock for ${item.food.dishname}, available: ${item.food.stock}`
        });
      }
    }

    const restaurant = await RestaurantReg.findByPk(rest_id, { transaction: t });
    if (!restaurant) {
      await t.rollback();
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Calculate subtotal & prepare order items
    let subtotal = 0;
    const orderItemsData = cart.items.map(item => {
      let addOns = [];
      if (item.selectedAddOns) {
        if (typeof item.selectedAddOns === 'string') {
          try { addOns = JSON.parse(item.selectedAddOns); } catch {}
        } else if (Array.isArray(item.selectedAddOns)) {
          addOns = item.selectedAddOns;
        }
      }
      const addOnTotal = addOns.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const itemTotal = item.quantity * (Number(item.unitPrice) + addOnTotal);
      subtotal += itemTotal;
      return {
        orderId: null,
        foodId: item.foodId,
        quantity: item.quantity,
        price: item.unitPrice,
        selectedAddOns: JSON.stringify(addOns),
        totalPrice: itemTotal,
        foodName: item.food.dishname
      };
    });

    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal >= restaurant.minOrderAmount ? 0 : Number(restaurant.baseDeliveryFee || 50);

    // Optional: check delivery radius
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

    // Create Order with customer info
    const order = await Order.create({
      userId,
      cartId,
      rest_id,
      address,
      latitude: customerLat,
      longitude: customerLng,
      customerName: user.name,
      customerPhone: user.mobile,
      paymentMethod,
      subtotal,
      tax,
      deliveryFee,
      totalAmount,
      status: 'PENDING',
      paymentStatus: 'PAID'
    }, { transaction: t });

    // Save order items
    orderItemsData.forEach(item => item.orderId = order.id);
    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // Deduct stock
    for (const item of cart.items) {
      item.food.stock -= item.quantity;
      await item.food.save({ transaction: t });
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId }, transaction: t });
    await cart.update({ status: 'checked_out' }, { transaction: t });

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
        latitude: order.latitude,
        longitude: order.longitude,
        customerName: order.customerName,
        customerPhone: order.customerPhone
      }
    });

  } catch (err) {
    console.error('Checkout Error:', err);
    if (!t.finished) await t.rollback();
    return res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
};

// ------------------- Track Order -------------------
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

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const remainingTime = ['PREPARING', 'READY'].includes(order.status) ? order.estimatedPreparationTime || null : null;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedPreparationTime: order.estimatedPreparationTime,
        remainingTime,
        restaurant: order.restaurant,
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          latitude: order.latitude,
          longitude: order.longitude
        },
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

// ------------------- Helper Functions -------------------
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi)*(y - yi)/(yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
