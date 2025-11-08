// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/deliverypartner/deliveryOrderController');
const { authenticatePartner } = require("../../middlewares/authMiddleware");


// ------------------- ORDER ROUTES -------------------
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrder);

// ------------------- DELIVERY ROUTES (Partner Side) -------------------

// Auto-assigned delivery shown to partner
router.get('/delivery/new',authenticatePartner, orderController.getNewDeliveryRequests);

// Partner accepts a delivery
router.put('/delivery/:deliveryId/accept',authenticatePartner, orderController.acceptDelivery);

// Partner rejects a delivery
router.put('/delivery/:deliveryId/reject',authenticatePartner, orderController.rejectDelivery);

// Get partner’s current active delivery
router.get('/delivery/current',authenticatePartner, orderController.getCurrentDelivery);

// Mark as picked up from restaurant
router.put('/delivery/:deliveryId/pickedup',authenticatePartner, orderController.markPickedUp);

router.put('/delivery/:deliveryId/photo',authenticatePartner, orderController.uploadDeliveryPhoto, orderController.uploadDeliveryProof);

router.post('/delivery/:deliveryId/verify-otp',authenticatePartner, orderController.verifyDeliveryOtp);


// Delivery history for partner
router.get('/delivery/history',authenticatePartner, orderController.getDeliveryHistory);

module.exports = router;






