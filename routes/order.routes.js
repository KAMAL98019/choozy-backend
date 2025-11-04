// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const checkoutController = require('../controllers/checkout.controller');


/// Checkout process
router.post('/checkout', checkoutController.checkout);


// ------------------- ORDER ROUTES -------------------
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrder);

// ------------------- DELIVERY ROUTES (Partner Side) -------------------

// Auto-assigned delivery shown to partner
router.get('/delivery/new', orderController.getNewDeliveryRequests);

// Partner accepts a delivery
router.put('/delivery/:deliveryId/accept', orderController.acceptDelivery);

// Partner rejects a delivery
router.put('/delivery/:deliveryId/reject', orderController.rejectDelivery);

// Get partner’s current active delivery
router.get('/delivery/current', orderController.getCurrentDelivery);

// Mark as picked up from restaurant
router.put('/delivery/:deliveryId/pickedup', orderController.markPickedUp);

router.put('/delivery/:deliveryId/photo', orderController.uploadDeliveryPhoto, orderController.uploadDeliveryProof);

router.post('/delivery/:deliveryId/verify-otp', orderController.verifyDeliveryOtp);


// Delivery history for partner
router.get('/delivery/history', orderController.getDeliveryHistory);

module.exports = router;






