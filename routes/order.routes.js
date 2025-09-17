const router = require('express').Router();
const checkoutController = require('../controllers/checkout.controller');
const orderController = require('../controllers/order.controller');

// Checkout process
router.post('/checkout', checkoutController.checkout);

// Orders
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrder);

// Update status (paid, cancelled, delivered etc.)
router.put('/orders/:id/status', orderController.updateOrderStatus);

// Delete order (optional, mostly for admin/debug)
router.delete('/orders/:id', orderController.deleteOrder);

module.exports = router;
