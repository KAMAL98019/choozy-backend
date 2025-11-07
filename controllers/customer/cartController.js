const { 
  Cart, 
  CartItem, 
  FoodItem, 
  RestaurantReg, 
  RestaurantStatus,
  sequelize 
} = require('../../models');
const { Op } = require('sequelize');

// ==================== GET ACTIVE CART ====================
exports.getActiveCart = async (req, res) => {
  try {
    const { userId } = req.query; // Pass as query parameter

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const cart = await Cart.findOne({
      where: { 
        userId, 
        status: "active",
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [{ 
            model: FoodItem, 
            as: "food",
            include: [{ model: RestaurantReg, as: 'restaurant' }]
          }]
        },
        {
          model: RestaurantReg,
          as: 'restaurant'
        }
      ]
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "No active cart found.",
        cart: null
      });
    }

    // Check if restaurant is still online
    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: cart.rest_id },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: "Active cart fetched successfully.",
      cart: {
        ...cart.toJSON(),
        restaurantOnline: restStatus?.status === 'ONLINE'
      }
    });

  } catch (e) {
    console.error("Error fetching active cart:", e);
    res.status(500).json({
      success: false,
      error: "Failed to get cart",
      details: e.message
    });
  }
};

// ==================== ADD ITEM (SWIGGY/ZOMATO STYLE) ====================
exports.addItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, foodId, quantity, selectedAddOns } = req.body;

    // Validate input
    if (!userId || !foodId) {
      await t.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'userId and foodId are required' 
      });
    }

    // Get food item with restaurant info
    const food = await FoodItem.findByPk(foodId, {
      include: [{ model: RestaurantReg, as: 'restaurant' }],
      transaction: t
    });

    if (!food) {
      await t.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'Food item not found' 
      });
    }

    // Check if food is available
    if (food.is_available === false) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: `${food.dishname} is currently unavailable`
      });
    }

    // ✅ CRITICAL: Check restaurant online status
    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: food.rest_id },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (!restStatus || restStatus.status !== 'ONLINE') {
      await t.rollback();
      return res.status(403).json({
        success: false,
        code: 'RESTAURANT_OFFLINE',
        message: `${food.restaurant.rest_name} is currently closed or offline.`
      });
    }

    // ✅ SWIGGY/ZOMATO PATTERN: Check for existing cart from DIFFERENT restaurant
    const existingCart = await Cart.findOne({
      where: { 
        userId, 
        status: 'active',
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food' }]
        },
        {
          model: RestaurantReg,
          as: 'restaurant'
        }
      ],
      transaction: t
    });

    // ✅ If cart exists from DIFFERENT restaurant → Return conflict
    if (existingCart && existingCart.rest_id !== food.rest_id) {
      await t.rollback();
      return res.status(409).json({ // 409 Conflict
        success: false,
        code: 'DIFFERENT_RESTAURANT',
        message: 'Items already in cart from a different restaurant',
        data: {
          currentCart: {
            cartId: existingCart.id,
            restaurantId: existingCart.rest_id,
            restaurantName: existingCart.restaurant?.rest_name,
            itemCount: existingCart.items?.length || 0,
            items: existingCart.items?.map(item => ({
              id: item.id,
              name: item.food?.dishname,
              quantity: item.quantity
            }))
          },
          newItem: {
            restaurantId: food.rest_id,
            restaurantName: food.restaurant.rest_name,
            foodId: food.id,
            foodName: food.dishname
          }
        }
      });
    }

    // ✅ Get or create cart for THIS restaurant
    let cart = existingCart;
    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

      cart = await Cart.create({
        userId,
        rest_id: food.rest_id,
        status: 'active',
        expiresAt
      }, { transaction: t });
    } else {
      // Extend expiry on activity
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + 24);
      await cart.update({ 
        expiresAt: newExpiry,
        updatedAt: new Date()
      }, { transaction: t });
    }

    // ✅ Process add-ons
    let finalAddOns = [];
    if (Array.isArray(selectedAddOns)) {
      for (const addOn of selectedAddOns) {
        if (typeof addOn === 'object') {
          finalAddOns.push(addOn);
        } else if (typeof addOn === 'number') {
          const addOnObj = food.customised_options?.add_ons?.[addOn];
          if (addOnObj) finalAddOns.push(addOnObj);
        }
      }
    }

    const addOnKey = JSON.stringify(
      finalAddOns.sort((a, b) => a.name.localeCompare(b.name))
    );

    // ✅ Check for existing item with same add-ons
    const existingItem = await CartItem.findOne({
      where: { cartId: cart.id, foodId },
      transaction: t
    });

    let item;
    if (existingItem) {
      const existingKey = JSON.stringify(
        (typeof existingItem.selectedAddOns === 'string'
          ? JSON.parse(existingItem.selectedAddOns)
          : existingItem.selectedAddOns || []
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      if (existingKey === addOnKey) {
        // Same item + same add-ons → Increment quantity
        await existingItem.update({
          quantity: existingItem.quantity + (quantity || 1)
        }, { transaction: t });
        item = existingItem;
      } else {
        // Same item + different add-ons → Create new cart item
        item = await CartItem.create({
          cartId: cart.id,
          foodId,
          quantity: quantity || 1,
          unitPrice: food.price,
          selectedAddOns: finalAddOns
        }, { transaction: t });
      }
    } else {
      // New item
      item = await CartItem.create({
        cartId: cart.id,
        foodId,
        quantity: quantity || 1,
        unitPrice: food.price,
        selectedAddOns: finalAddOns
      }, { transaction: t });
    }

    await t.commit();

    // Return updated cart
    const updatedCart = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food' }]
        },
        {
          model: RestaurantReg,
          as: 'restaurant'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      cart: updatedCart,
      addedItem: item
    });

  } catch (err) {
    await t.rollback();
    console.error('Add item error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add item to cart',
      details: err.message 
    });
  }
};

// ==================== CLEAR CART AND ADD ITEM ====================
exports.clearCartAndAddItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId } = req.body;

    if (!userId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Mark all active carts as abandoned
    await Cart.update(
      { status: 'abandoned' },
      { 
        where: { 
          userId, 
          status: 'active' 
        },
        transaction: t 
      }
    );

    await t.commit();

    // Now call addItem (it will create a fresh cart)
    return this.addItem(req, res);

  } catch (err) {
    await t.rollback();
    console.error('Clear cart error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear cart' 
    });
  }
};

// ==================== UPDATE ITEM ====================
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, quantity } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (quantity < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Quantity cannot be negative' 
      });
    }

    const item = await CartItem.findByPk(id, {
      include: [
        { 
          model: FoodItem, 
          as: 'food',
          include: [{ model: RestaurantReg, as: 'restaurant' }]
        },
        {
          model: Cart,
          as: 'cart'
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    // Verify cart belongs to user
    if (item.cart.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - This cart does not belong to you'
      });
    }

    // ✅ Check restaurant status
    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: item.food.rest_id },
      order: [['createdAt', 'DESC']],
    });

    if (!restStatus || restStatus.status !== 'ONLINE') {
      return res.status(403).json({
        success: false,
        message: `${item.food.restaurant.rest_name} is currently offline. Cannot modify cart.`
      });
    }

    // Remove item if quantity is 0
    if (quantity === 0) {
      await item.destroy();
      return res.json({ 
        success: true,
        message: 'Item removed from cart' 
      });
    }

    // Update quantity
    await item.update({ quantity });

    res.json({
      success: true,
      message: 'Item updated',
      item
    });

  } catch (e) {
    console.error("UpdateItem Error:", e);
    res.status(500).json({ 
      success: false,
      error: e.message 
    });
  }
};

// ==================== REMOVE ITEM ====================
exports.removeItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const item = await CartItem.findByPk(id, {
      include: [{ model: Cart, as: 'cart' }]
    });

    if (!item) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    // Verify ownership
    if (item.cart.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - This cart does not belong to you'
      });
    }

    await item.destroy();

    res.json({ 
      success: true,
      message: 'Item removed from cart' 
    });

  } catch (e) {
    console.error('Remove item error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove item' 
    });
  }
};

// ==================== CART SUMMARY ====================
exports.summary = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const cart = await Cart.findOne({
      where: { id: cartId, userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food' }]
        }
      ]
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        error: "Cart not found" 
      });
    }

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Cart is empty" 
      });
    }

    const restaurant = await RestaurantReg.findByPk(cart.rest_id);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: "Restaurant not found" 
      });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      let selectedAddOns = [];
      if (item.selectedAddOns) {
        try {
          selectedAddOns = typeof item.selectedAddOns === "string" 
            ? JSON.parse(item.selectedAddOns) 
            : item.selectedAddOns;
        } catch {
          selectedAddOns = [];
        }
      }
      const addOnsTotal = selectedAddOns.reduce((a, addon) => 
        a + Number(addon.price || 0), 0
      );
      return sum + (Number(item.unitPrice) + addOnsTotal) * item.quantity;
    }, 0);

    const tax = +(subtotal * 0.05).toFixed(2);
    const minOrderAmount = restaurant.minOrderAmount || 500;
    const baseDeliveryFee = restaurant.baseDeliveryFee || 40;
    const deliveryFee = subtotal < minOrderAmount ? baseDeliveryFee : 0;
    const total = +(subtotal + tax + deliveryFee).toFixed(2);

    return res.json({
      success: true,
      cartId,
      items: cart.items,
      subtotal,
      tax,
      deliveryFee,
      total,
      minOrderAmount,
      isBelowMinOrder: subtotal < minOrderAmount,
      restaurant: {
        id: restaurant.id,
        name: restaurant.rest_name,
        minOrderAmount,
        baseDeliveryFee
      }
    });

  } catch (e) {
    console.error("Summary Error:", e);
    res.status(500).json({ 
      success: false,
      error: "Failed to compute summary",
      details: e.message 
    });
  }
};

// ==================== VALIDATE CART (PRE-CHECKOUT) ====================
exports.validateCart = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cartId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const cart = await Cart.findOne({
      where: { id: cartId, userId, status: 'active' },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: FoodItem, as: 'food' }]
        }
      ],
      transaction: t
    });

    if (!cart || !cart.items.length) {
      await t.rollback();
      return res.status(400).json({
        valid: false,
        error: 'Cart is empty'
      });
    }

    const issues = [];
    const priceUpdates = [];
    const itemsToRemove = [];

    // ✅ Check restaurant status
    const restStatus = await RestaurantStatus.findOne({
      where: { rest_id: cart.rest_id },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (!restStatus || restStatus.status !== 'ONLINE') {
      await t.rollback();
      return res.status(403).json({
        valid: false,
        code: 'RESTAURANT_OFFLINE',
        error: 'Restaurant is currently closed. Cannot proceed with checkout.'
      });
    }

    // ✅ Validate each item
    for (const item of cart.items) {
      // Item deleted
      if (!item.food) {
        issues.push({
          type: 'ITEM_DELETED',
          itemId: item.id,
          message: 'This item is no longer available'
        });
        itemsToRemove.push(item.id);
        continue;
      }

      // Item unavailable
      if (item.food.is_available === false) {
        issues.push({
          type: 'ITEM_UNAVAILABLE',
          itemId: item.id,
          foodName: item.food.dishname,
          message: `${item.food.dishname} is currently unavailable`
        });
        itemsToRemove.push(item.id);
        continue;
      }

      // Stock check
      if (item.food.stock && item.quantity > item.food.stock) {
        issues.push({
          type: 'INSUFFICIENT_STOCK',
          itemId: item.id,
          foodName: item.food.dishname,
          requested: item.quantity,
          available: item.food.stock,
          message: `Only ${item.food.stock} available for ${item.food.dishname}`
        });
      }

      // ✅ Price change detection
      const currentPrice = parseFloat(item.unitPrice);
      const newPrice = parseFloat(item.food.price);

      if (currentPrice !== newPrice) {
        const priceDiff = newPrice - currentPrice;
        const increased = priceDiff > 0;

        priceUpdates.push({
          type: 'PRICE_CHANGED',
          itemId: item.id,
          foodName: item.food.dishname,
          oldPrice: currentPrice,
          newPrice: newPrice,
          difference: Math.abs(priceDiff),
          increased,
          message: `Price ${increased ? 'increased' : 'decreased'} by ₹${Math.abs(priceDiff).toFixed(2)}`
        });

        // Auto-update price
        await item.update({ unitPrice: newPrice }, { transaction: t });
      }
    }

    // Remove unavailable items
    if (itemsToRemove.length > 0) {
      await CartItem.destroy({
        where: { id: itemsToRemove },
        transaction: t
      });
    }

    await t.commit();

    const valid = issues.filter(i => i.type !== 'PRICE_CHANGED').length === 0;

    res.json({
      success: true,
      valid,
      issues,
      priceUpdates,
      requiresConfirmation: priceUpdates.length > 0 || issues.length > 0,
      message: !valid 
        ? 'Some items are unavailable and have been removed from cart'
        : priceUpdates.length > 0
        ? 'Prices have been updated. Please review before checkout.'
        : 'Cart is valid and ready for checkout'
    });

  } catch (e) {
    await t.rollback();
    console.error('Validation error:', e);
    res.status(500).json({ 
      success: false,
      error: 'Validation failed',
      details: e.message 
    });
  }
};

// ==================== CLEANUP EXPIRED CARTS (CRON JOB) ====================
exports.cleanupExpiredCarts = async () => {
  try {
    const result = await Cart.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          expiresAt: { [Op.lt]: new Date() }
        }
      }
    );
    console.log(`✅ Expired ${result[0]} carts`);
    return result[0];
  } catch (e) {
    console.error('❌ Cleanup error:', e);
    throw e;
  }
};

module.exports = exports;