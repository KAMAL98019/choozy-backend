const express = require('express');
const router = express.Router();
const statusController = require('../controllers/restaurantStatus.controller');

// Create new status
router.post('/restaurant-status', statusController.createStatus);

// Update existing status
router.put('/restaurant-status/:id', statusController.updateStatus);

module.exports = router;
