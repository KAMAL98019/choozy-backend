const express = require('express');
const router = express.Router();
const statusController = require('../controllers/restaurantStatus.controller');

// Upsert restaurant status
router.post('/restaurant-status', statusController.upsertStatus);

module.exports = router;
