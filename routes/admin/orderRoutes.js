const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/orderController');
const { authenticateAdmin } = require("../../middlewares/authMiddleware");

// Get all orders with filters and pagination
router.get('/orders',authenticateAdmin, orderController.getAllOrders);

// Get order statistics
router.get('/orders/stats',authenticateAdmin, orderController.getOrderStats);

// Get single order details
router.get('/orders/:orderId',authenticateAdmin, orderController.getOrderDetails);

// Update order status
router.put('/orders/:orderId/status',authenticateAdmin, orderController.updateOrderStatus);


module.exports = router;