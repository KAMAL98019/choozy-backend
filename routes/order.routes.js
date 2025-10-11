// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const checkoutController = require('../controllers/checkout.controller');

/// Checkout process
router.post('/checkout', checkoutController.checkout);


// Partner
router.post('/delivery/assign', orderController.assignDelivery);
router.put('/delivery/:assignmentId/respond', orderController.respondToDelivery);
router.put('/delivery/:assignmentId/status', orderController.updateDeliveryStatus);

// Orders
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrder);

module.exports = router;






