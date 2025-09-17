const { sequelize, Cart, CartItem, FoodItem, Order, OrderItem } = require('../models');

exports.checkout = async (req, res) => {
  const { userId, cartId } = req.body;

  // Start a transaction
  const t = await sequelize.transaction();

  try {
    // Fetch cart with items and food details
    const cart = await Cart.findOne({
      where: { id: cartId, userId },
      include: [
        { 
          model: CartItem, 
          as: 'items', 
          include: [{ model: FoodItem, as: 'food' }] 
        }
      ],
      transaction: t
    });

    // Check if cart is empty
    if (!cart || cart.items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock for each item
    for (let item of cart.items) {
      if (item.quantity > item.food.stock) {
        await t.rollback();
        return res.status(400).json({
          error: `Not enough stock for ${item.food.dishname}, available: ${item.food.stock}`
        });
      }
    }

    // Calculate amounts
    let subtotal = 0;
    cart.items.forEach(item => subtotal += item.quantity * item.food.price);
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const deliveryFee = 50;
    const totalAmount = parseFloat((subtotal + tax + deliveryFee).toFixed(2));

    // Create order
    const order = await Order.create({
      userId,
      cartId,
      subtotal,
      tax,
      deliveryFee,
      totalAmount,
      status: 'PENDING'
    }, { transaction: t });

    // Create order items
    const orderItemsData = cart.items.map(item => ({
      orderId: order.id,
      foodId: item.foodId,
      quantity: item.quantity,
      price: item.food.price,
      totalPrice: parseFloat((item.quantity * item.food.price).toFixed(2))
    }));

    const orderItems = await OrderItem.bulkCreate(orderItemsData, { returning: true, transaction: t });

    // Deduct stock
    for (let item of cart.items) {
      item.food.stock -= item.quantity;
      await item.food.save({ transaction: t });
    }

    // Clear cart
    await CartItem.destroy({ where: { cartId }, transaction: t });

    // Commit transaction
    await t.commit();

    // Send response
    return res.status(201).json({
      message: 'Checkout successful',
      order: {
        orderId: order.id,
        cartId,
        subtotal,
        tax,
        deliveryFee,
        totalAmount,
        status: order.status,
        items: orderItems
      }
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
};
