// routes/restaurantOrderRoutes.js
const express = require('express');
const router = express.Router();
const restaurantOrderController = require('../controllers/restaurantOrderController');

// Set or update restaurant status
router.post('/restaurant/status', restaurantOrderController.setStatus);

// Get detailed order information
router.get('/order/details/:orderId', restaurantOrderController.getOrderDetails);

module.exports = router;
