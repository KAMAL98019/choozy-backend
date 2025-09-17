const { Cart, CartItem, FoodItem , Order, sequelize } = require('../models');

exports.getActiveCart = async (req,res)=>{
  try{
    const { userId } = req.params; // UUID
    const cart = await Cart.findOne({
      where: { userId, status: 'active' },
      include: { model: CartItem, as: 'items', include: [Food] }
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

exports.addItem = async (req,res)=>{
  const t = await sequelize.transaction();
  try{
    const { cartId, foodId, quantity } = req.body;
    const food = await FoodItem .findByPk(foodId, { transaction:t });
    if(!food ) { await t.rollback(); return res.status(400).json({error:'Food unavailable'}); }

    const unitPrice = food.price;
    let item = await CartItem.findOne({ where:{ cartId, foodId }, transaction:t });
    if(item){
      await item.update({ quantity: item.quantity + (quantity || 1), unitPrice }, { transaction:t });
    } else {
      item = await CartItem.create({ cartId, foodId, quantity: quantity||1, unitPrice }, { transaction:t });
    }
    await t.commit();
    res.status(201).json(item);
  }catch(e){ console.error("AddItem Error:", e); await t.rollback(); res.status(400).json({error: e.message}); }
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

exports.summary = async (req,res)=>{
  try{
    const { cartId } = req.params;
    const items = await CartItem.findAll({ where: { cartId }, include:[ {model: FoodItem, as: 'food'}] });
    const subtotal = items.reduce((s,i)=> s + Number(i.unitPrice)*i.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal > 499 ? 0 : 40;
    const total = +(subtotal + tax + deliveryFee).toFixed(2);
    res.json({ cartId, items, subtotal, tax, deliveryFee, total });
  }catch(e){
  console.error("Summary Error:", e.message, e.stack);
  res.status(500).json({ error:'Failed to compute summary', details:e.message });
}

};
