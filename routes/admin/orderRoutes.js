const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/orderController');

// Get all orders with filters and pagination
router.get('/orders', orderController.getAllOrders);

// Get order statistics
router.get('/orders/stats', orderController.getOrderStats);

// Get single order details
router.get('/orders/:orderId', orderController.getOrderDetails);

// Update order status
router.put('/orders/:orderId/status', orderController.updateOrderStatus);


module.exports = router;