const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/admin/userController');
const { authenticateAdmin } = require('../../middlewares/authMiddleware');
// Get all customers with pagination
router.get('/customers',authenticateAdmin, customerController.getAllCustomers);

// Get customer statistics
router.get('/customers/stats',authenticateAdmin, customerController.getCustomerStats);

// Get single customer details
router.get('/customers/:id',authenticateAdmin, customerController.getCustomerById);

// Block/Unblock customer
router.put('/customers/:id/status',authenticateAdmin, customerController.updateCustomerStatus);

module.exports = router;
