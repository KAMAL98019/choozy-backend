// ==================== ROUTES ====================
// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/rest-order.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

//  Get all orders with status filter
router.get('/', orderController.getAllOrders);

// Get order history
router.get('/history', orderController.getOrderHistory);

//  Get order details
router.get('/:id', orderController.getOrderById);

// Accept order
router.put('/:id/accept', authorize(['PARTNER', 'ADMIN']), orderController.acceptOrder);

//  Reject order
router.put('/:id/reject', authorize(['PARTNER', 'ADMIN']), orderController.rejectOrder);

// Update order status (progression)
router.put('/:id/status', authorize(['PARTNER', 'ADMIN']), orderController.updateOrderStatus);

// Print KOT
router.get('/:id/kot', authorize(['PARTNER', 'ADMIN']), orderController.printKOT);

router.get('/:id/track', orderController.trackOrder);

module.exports = router;