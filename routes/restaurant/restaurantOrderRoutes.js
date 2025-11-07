// routes/restaurantOrderRoutes.js
const express = require('express');
const router = express.Router();
const restaurantOrderController = require('../../controllers/restaurant/restaurantOrderController');

// Get all orders
router.get('/all', restaurantOrderController.getAllOrders);

// Get order history
router.get('/history', restaurantOrderController.getOrderHistory);

// Get order details
router.get('/:id', restaurantOrderController.getOrderById);

// Accept order
router.put('/:id/accept', restaurantOrderController.acceptOrder);

// Reject order
router.put('/:id/reject', restaurantOrderController.rejectOrder);

// Update order status
router.put('/:id/status', restaurantOrderController.updateOrderStatus);

// Print KOT
router.get('/:id/kot', restaurantOrderController.printKOT);

// Track order
router.get('/:id/track', restaurantOrderController.trackOrder);

module.exports = router;
