const { Order } = require('../models');

exports.getOrders = async (req, res) => {
  const orders = await Order.findAll({ include: ['items', 'cart'] });
  res.json(orders);
};

exports.getOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ['items', 'cart'] });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'CANCELLED' && !['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.deleteOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  await order.destroy();
  res.json({ message: 'Order deleted' });
};

