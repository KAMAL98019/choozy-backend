const { 
  sequelize, 
  Cart, 
  CartItem, 
  FoodItem, 
  Order, 
  OrderItem, 
  RestaurantReg,
  RestaurantStatus,
  User
} = require('../../models');
const { validate: isUuid } = require('uuid');

// ==================== CHECKOUT ====================
exports.checkout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
      userId, 
      cartId, 
      address, 
      paymentMethod, 
      customerLat, 
      customerLng 
    } = req.body;

    console.log('Checkout request body:', req.body);

    // ----------------- UUID validation -----------------
    if (!isUuid(userId) || !isUuid(cartId)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'userId and cartId must be valid UUIDs'
      });
    }

    if (!address || !paymentMethod) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'address and paymentMethod are required'
      });
    }

    // ----------------- Fetch user -----------------
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      console.error(`User not found with ID: ${userId}`);
      await t.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // ----------------- Fetch cart -----------------
    const cart = await Cart.findOne({
      where: { id: cartId, userId, status: 'active' },
      include: [
        { 
          model: CartItem, 
          as: 'items', 
          include: [{ model: FoodItem, as: 'food' }] 
        }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!cart || cart.items.length === 0) {
      console.error(`Cart not found or empty for userId: ${userId}, cartId: ${cartId}`);
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cart is empty or not found'
      });
    }

    // ----------------- Restaurant status -----------------
    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: cart.rest_id },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (!restStatus || restStatus.status !== 'ONLINE') {
      await t.rollback();
      return res.status(403).json({
        success: false,
        code: 'RESTAURANT_OFFLINE',
        error: 'Restaurant went offline. Cannot complete checkout.'
      });
    }

    // ----------------- Fetch restaurant -----------------
    const restaurant = await RestaurantReg.findByPk(cart.rest_id, { transaction: t });
    if (!restaurant) {
      console.error(`Restaurant not found with ID: ${cart.rest_id}`);
      await t.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant not found' 
      });
    }

    // ----------------- Validate stock & availability -----------------
    for (const item of cart.items) {
      if (!item.food || item.food.is_available === false) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `${item.food?.dishname || 'Item'} is no longer available`
        });
      }

      if (item.food.stock && item.quantity > item.food.stock) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Not enough stock for ${item.food.dishname}. Available: ${item.food.stock}`
        });
      }
    }

    // ----------------- Calculate totals -----------------
    let subtotal = 0;
    const orderItemsData = cart.items.map(item => {
      let addOns = [];
      if (item.selectedAddOns) {
        addOns = typeof item.selectedAddOns === 'string' 
          ? JSON.parse(item.selectedAddOns) 
          : item.selectedAddOns || [];
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
    const minOrderAmount = restaurant.minOrderAmount || 500;
    const baseDeliveryFee = restaurant.baseDeliveryFee || 40;
    const deliveryFee = subtotal >= minOrderAmount ? 0 : baseDeliveryFee;
    const totalAmount = +(subtotal + tax + deliveryFee).toFixed(2);

    // ----------------- Create Order -----------------
    const order = await Order.create({
      userId,
      cartId,
      rest_id: cart.rest_id,
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
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID'
    }, { transaction: t });

    // ----------------- Create OrderItems -----------------
    orderItemsData.forEach(item => item.orderId = order.id);
    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // ----------------- Deduct stock -----------------
    for (const item of cart.items) {
      if (item.food.stock !== null) {
        await item.food.update(
          { stock: item.food.stock - item.quantity },
          { transaction: t }
        );
      }
    }

    // ----------------- Mark cart as checked out -----------------
    await cart.update({ status: 'checked_out' }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        restaurant: {
          id: restaurant.id,
          name: restaurant.rest_name,
          address: restaurant.rest_address,
          phone: restaurant.contact_number
        },
        customer: {
          id: user.id,
          name: user.name,
          phone: user.mobile
        },
        items: orderItemsData.map(i => ({
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
        deliveryAddress: address
      }
    });

  } catch (err) {
    console.error('Checkout Error:', err);
    if (!t.finished) await t.rollback();
    return res.status(500).json({
      success: false,
      error: 'Checkout failed',
      details: err.message
    });
  }
};

module.exports = exports;
