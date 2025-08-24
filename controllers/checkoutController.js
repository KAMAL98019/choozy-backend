const { Cart, CartItem, Order, sequelize } = require('../models');

exports.proceedToPay = async (req,res)=>{
  const t = await sequelize.transaction();
  try{
    const { cartId, userId, paymentMethod } = req.body;

    const cart = await Cart.findOne({ where:{ id: cartId, userId, status:'active' }, transaction:t });
    if(!cart) { await t.rollback(); return res.status(404).json({error:'Active cart not found'}); }

    const items = await CartItem.findAll({ where: { cartId }, transaction:t });
    if(items.length === 0){ await t.rollback(); return res.status(400).json({error:'Cart is empty'}); }

    const subtotal = items.reduce((s,i)=> s + Number(i.unitPrice)*i.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const deliveryFee = subtotal > 499 ? 0 : 40;
    const total = +(subtotal + tax + deliveryFee).toFixed(2);

    const order = await Order.create({
      userId, cartId, subtotal, tax, deliveryFee, total,
      status: 'pending', paymentMethod: paymentMethod || 'cod'
    }, { transaction:t });

    await cart.update({ status: 'checked_out' }, { transaction:t });

    await t.commit();
    res.status(201).json({ message: 'Order created', order });
  }catch(e){ console.error(e); await t.rollback(); res.status(400).json({error:'Checkout failed'}); }
};

exports.markPaid = async (req,res)=>{
  try{
    const { orderId } = req.params;
    const { paymentRef } = req.body;
    const order = await Order.findByPk(orderId);
    if(!order) return res.status(404).json({error:'Order not found'});
    await order.update({ status: 'paid', paymentRef: paymentRef || null });
    res.json({ message:'Payment captured', order });
  }catch(e){ console.error(e); res.status(400).json({error:'Payment update failed'}); }
};

exports.getOrder = async (req,res)=>{
  try{
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if(!order) return res.status(404).json({error:'Not found'});
    res.json(order);
  }catch(e){ console.error(e); res.status(500).json({error:'Fetch failed'}); }
};

exports.cancelOrder = async (req,res)=>{
  try{
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if(!order) return res.status(404).json({error:'Not found'});
    await order.update({ status:'cancelled' });
    res.json({ message:'Order cancelled', order });
  }catch(e){ console.error(e); res.status(400).json({error:'Cancel failed'}); }
};
