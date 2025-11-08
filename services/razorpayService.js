// ==================== STEP 3: Razorpay Service (services/razorpayService.js) ====================
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay Order
 */
const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    };

    const order = await razorpayInstance.orders.create(options);
    console.log('✅ Razorpay Order Created:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Razorpay Order Creation Failed:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};

/**
 * Verify Razorpay Payment Signature
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('❌ Signature Verification Failed:', error);
    return false;
  }
};

/**
 * Fetch Payment Details
 */
const fetchPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('❌ Failed to fetch payment details:', error);
    throw error;
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
  razorpayInstance
};