const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/admin/userController');
// const { authenticate, isAdmin } = require('../../middleware/auth');

// Get all customers with pagination
router.get('/customers', customerController.getAllCustomers);

// Get customer statistics
router.get('/customers/stats', customerController.getCustomerStats);

// Get single customer details
router.get('/customers/:id', customerController.getCustomerById);

// Block/Unblock customer
router.put('/customers/:id/status', customerController.updateCustomerStatus);

module.exports = router;
