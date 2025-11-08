const express = require('express');
const router = express.Router();
const statusController = require('../../controllers/restaurant/restaurantStatusController');
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");


// Upsert restaurant status
router.post('/restaurant-status',authenticateRestaurant, statusController.upsertStatus);

module.exports = router;
