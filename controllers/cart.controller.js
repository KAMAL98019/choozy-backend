const { Cart, CartItem, FoodItem, Order, sequelize, RestaurantReg } = require('../models');


exports.getActiveCart = async (req,res)=>{
  try{
    const { userId } = req.params; // UUID
    const cart = await Cart.findOne({
      where: { userId, status: 'active' },
      include: { model: CartItem, as: 'items', include: [{ model: FoodItem, as: 'food' }] }

    });
    res.json(cart || null);
  }catch(e){ console.error(e); res.status(500).json({error:'Failed to get cart'}); }
};

exports.ensureCart = async (req,res)=>{
  try{
    const { userId } = req.body;
    let cart = await Cart.findOne({ where: { userId, status:'active' }});
    if(!cart) cart = await Cart.create({ userId, status:'active' });
    res.status(201).json(cart);
  }catch(e){ console.error(e); res.status(400).json({error:'Failed to create/find cart'}); }
};

exports.addItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cartId, foodId, quantity, selectedAddOns } = req.body;

    const food = await FoodItem.findByPk(foodId);
    if (!food) {
      await t.rollback();
      return res.status(404).json({ error: 'Food not found' });
    }

    // normalize addons (stringify for comparison)
    let finalAddOns = [];
    if (Array.isArray(selectedAddOns)) {
      for (const addOn of selectedAddOns) {
        if (typeof addOn === "object") {
          finalAddOns.push(addOn);
        } else if (typeof addOn === "number") {
          const addOnObj = food.customised_options?.add_ons?.[addOn];
          if (addOnObj) finalAddOns.push(addOnObj);
        }
      }
    }

    const addOnKey = JSON.stringify(finalAddOns.sort((a, b) => a.name.localeCompare(b.name)));

    // 🔑 check if same item with same addons exists
    const existingItem = await CartItem.findOne({
      where: { cartId, foodId },
      transaction: t
    });

    let item;
    if (existingItem) {
      const existingKey = JSON.stringify(
        (typeof existingItem.selectedAddOns === "string"
          ? JSON.parse(existingItem.selectedAddOns)
          : existingItem.selectedAddOns || []
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      if (existingKey === addOnKey) {
        // same item → just update quantity
        await existingItem.update(
          { quantity: existingItem.quantity + (quantity || 1) },
          { transaction: t }
        );
        item = existingItem;
      } else {
        // different addons → create new row
        item = await CartItem.create({
          cartId,
          foodId,
          quantity: quantity || 1,
          unitPrice: food.price,
          selectedAddOns: finalAddOns
        }, { transaction: t });
      }
    } else {
      // no existing item → create new row
      item = await CartItem.create({
        cartId,
        foodId,
        quantity: quantity || 1,
        unitPrice: food.price,
        selectedAddOns: finalAddOns
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(item);
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
};



exports.updateItem = async (req,res)=>{
  try{
    const { id } = req.params; // CartItem UUID
    const { quantity } = req.body;
    const item = await CartItem.findByPk(id);
    if(!item) return res.status(404).json({error:'Item not found'});
    if(quantity <= 0){
      await item.destroy();
      return res.json({message:'Item removed'});
    }
    await item.update({ quantity });
    res.json(item);
  }catch(e){ console.error("AddItem Error:", e); res.status(400).json({error: e.message}); }
};

exports.removeItem = async (req,res)=>{
  try{
    const { id } = req.params;
    const item = await CartItem.findByPk(id);
    if(!item) return res.status(404).json({error:'Item not found'});
    await item.destroy();
    res.json({message:'Item removed'});
  }catch(e){ console.error(e); res.status(400).json({error:'Remove item failed'}); }
};

exports.summary = async (req, res) => {
  try {
    const { cartId } = req.params;

    // Fetch items with food info
    const items = await CartItem.findAll({
      where: { cartId },
      include: [{ model: FoodItem, as: 'food' }]
    });

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Get restaurant info from first item
    const restaurantId = items[0].food.rest_id;
    const restaurant = await RestaurantReg.findByPk(restaurantId);

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // Calculate subtotal
    const subtotal = items.reduce((s, i) => {
      let selectedAddOns = [];
      if (i.selectedAddOns) {
        try {
          selectedAddOns =
            typeof i.selectedAddOns === "string"
              ? JSON.parse(i.selectedAddOns)
              : i.selectedAddOns;
        } catch {
          selectedAddOns = [];
        }
      }

      const addOnsTotal = selectedAddOns.reduce(
        (a, addon) => a + Number(addon.price || 0),
        0
      );

      const itemTotal =
        Number(i.unitPrice) * i.quantity + addOnsTotal * i.quantity;

      return s + itemTotal;
    }, 0);

    // Tax
    const tax = +(subtotal * 0.05).toFixed(2);

    // Delivery Fee (restaurant-based)
    let deliveryFee = 0;
    const minOrderAmount = restaurant.minOrderAmount || 500;
    const baseDeliveryFee = restaurant.baseDeliveryFee || 40;

    if (subtotal < minOrderAmount) {
      deliveryFee = baseDeliveryFee;
    }

    const total = +(subtotal + tax + deliveryFee).toFixed(2);

    return res.json({
      cartId,
      items,
      subtotal,
      tax,
      deliveryFee,
      total,
      restaurant: {
        id: restaurant.id,
        name: restaurant.rest_name,
        minOrderAmount,
        baseDeliveryFee
      }
    });
  } catch (e) {
    console.error("Summary Error:", e.message, e.stack);
    res
      .status(500)
      .json({ error: "Failed to compute summary", details: e.message });
  }
};
