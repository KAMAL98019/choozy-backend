
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
const { createRazorpayOrder, verifyRazorpaySignature } = require('../../services/razorpayService');

// ==================== CREATE RAZORPAY ORDER (BEFORE CHECKOUT) ====================
exports.createPaymentOrder = async (req, res) => {
  try {
    const { userId, cartId } = req.body;

    if (!isUuid(userId) || !isUuid(cartId)) {
      return res.status(400).json({
        success: false,
        error: 'userId and cartId must be valid UUIDs'
      });
    }

    // Fetch cart to calculate amount
    const cart = await Cart.findOne({
      where: { id: cartId, userId, status: 'active' },
      include: [
        { 
          model: CartItem, 
          as: 'items', 
          include: [{ model: FoodItem, as: 'food' }] 
        }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty or not found'
      });
    }

    // Calculate total amount
    let subtotal = 0;
    cart.items.forEach(item => {
      let addOns = [];
      if (item.selectedAddOns) {
        addOns = typeof item.selectedAddOns === 'string' 
          ? JSON.parse(item.selectedAddOns) 
          : item.selectedAddOns || [];
      }
      const addOnTotal = addOns.reduce((sum, a) => sum + Number(a.price || 0), 0);
      const itemTotal = item.quantity * (Number(item.unitPrice) + addOnTotal);
      subtotal += itemTotal;
    });

    const restaurant = await RestaurantReg.findByPk(cart.rest_id);
    const tax = +(subtotal * 0.05).toFixed(2);
    const minOrderAmount = restaurant?.minOrderAmount || 500;
    const baseDeliveryFee = restaurant?.baseDeliveryFee || 40;
    const deliveryFee = subtotal >= minOrderAmount ? 0 : baseDeliveryFee;
    const totalAmount = +(subtotal + tax + deliveryFee).toFixed(2);

    // Create Razorpay Order
    const razorpayOrder = await createRazorpayOrder(
      totalAmount,
      'INR',
      `order_${cartId.slice(0, 8)}`,
      {
        userId,
        cartId,
        restaurantId: cart.rest_id
      }
    );

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID, // Send to frontend
      orderDetails: {
        subtotal,
        tax,
        deliveryFee,
        totalAmount
      }
    });

  } catch (error) {
    console.error('Create Payment Order Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment order',
      details: error.message
    });
  }
};

// ==================== CHECKOUT WITH RAZORPAY ====================
exports.checkout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
      userId, 
      cartId, 
      address, 
      paymentMethod, 
      customerLat, 
      customerLng,
      // Razorpay payment details (only for online payment)
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
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

    // ----------------- Verify Razorpay Payment (if online payment) -----------------
    if (paymentMethod === 'ONLINE' || paymentMethod === 'RAZORPAY') {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Razorpay payment details are required for online payment'
        });
      }

      const isValidSignature = verifyRazorpaySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValidSignature) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Invalid payment signature. Payment verification failed.'
        });
      }

      console.log('✅ Razorpay payment verified successfully');
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

    // ----------------- Determine payment status -----------------
    let paymentStatus = 'PENDING';
    if (paymentMethod === 'COD') {
      paymentStatus = 'PENDING'; // Will be paid on delivery
    } else if (paymentMethod === 'ONLINE' || paymentMethod === 'RAZORPAY') {
      paymentStatus = 'PAID'; // Already verified above
    }

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
      paymentStatus,
      // Store Razorpay transaction details
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      transactionId: razorpayPaymentId || null
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
        deliveryAddress: address,
        razorpayPaymentId: razorpayPaymentId || null
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

// ==================== VERIFY PAYMENT (Alternative endpoint) ====================
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification details'
      });
    }

    const isValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (isValid) {
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        verified: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        verified: false
      });
    }
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message
    });
  }
};

module.exports = exports;