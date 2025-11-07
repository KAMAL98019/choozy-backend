const express = require('express');
const router = express.Router();
const statusController = require('../../controllers/restaurant/restaurantStatusController');

// Upsert restaurant status
router.post('/restaurant-status', statusController.upsertStatus);

module.exports = router;
