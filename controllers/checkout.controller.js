const { sequelize, Cart, CartItem, FoodItem, Order, OrderItem, RestaurantReg, User } = require('../models');



exports.checkout = async (req, res) => {
  const { userId, cartId, rest_id, address, paymentMethod } = req.body;

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
          include: [
            {
              model: FoodItem,
              as: 'food',
              include: [{ model: RestaurantReg, as: 'restaurant' }]
            }
          ]
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

    // Create order using rest_id from request body
    const order = await Order.create({
      userId,
      cartId,
      rest_id, // from req.body
      address,
      paymentMethod,
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

    // Fetch restaurant and user details for response
    const restaurant = await RestaurantReg.findByPk(rest_id, { transaction: t });
    const user = await User.findByPk(userId, { transaction: t });

    // Commit transaction
    await t.commit();

    // Send response
    return res.status(201).json({
      message: 'Checkout successful',
      order: {
        orderId: order.id,
        cartId,
        rest_id,
        restaurant: {
          id: restaurant.id,
          name: restaurant.rest_name,
          address: restaurant.address,
          phone: restaurant.phone
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.mobile
        },
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
