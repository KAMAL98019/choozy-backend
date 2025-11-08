const express = require('express');
const router = express.Router();
const checkoutController = require('../../controllers/customer/checkoutController');
const { authenticateUser } = require('../../middlewares/authMiddleware');

// Create Razorpay order (before checkout)
router.post('/create-payment-order', authenticateUser, checkoutController.createPaymentOrder);

// Checkout with payment verification
router.post('/checkout', authenticateUser, checkoutController.checkout);

// Verify payment (optional separate endpoint)
router.post('/verify-payment', authenticateUser, checkoutController.verifyPayment);

module.exports = router;