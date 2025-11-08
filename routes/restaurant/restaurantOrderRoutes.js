// routes/restaurantOrderRoutes.js
const express = require('express');
const router = express.Router();
const restaurantOrderController = require('../../controllers/restaurant/restaurantOrderController');
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");

// Get all orders
router.get('/all',authenticateRestaurant, restaurantOrderController.getAllOrders);

// Get order history
router.get('/history',authenticateRestaurant, restaurantOrderController.getOrderHistory);

// Get order details
router.get('/:id',authenticateRestaurant, restaurantOrderController.getOrderById);

// Accept order
router.put('/:id/accept',authenticateRestaurant, restaurantOrderController.acceptOrder);

// Reject order
router.put('/:id/reject',authenticateRestaurant, restaurantOrderController.rejectOrder);

// Update order status
router.put('/:id/status',authenticateRestaurant, restaurantOrderController.updateOrderStatus);

// Print KOT
router.get('/:id/kot',authenticateRestaurant, restaurantOrderController.printKOT);

// Track order
router.get('/:id/track',authenticateRestaurant, restaurantOrderController.trackOrder);

module.exports = router;
