// routes/admin/restaurantRoutes.js
const express = require('express');
const router = express.Router();
const restaurantController = require('../../controllers/admin/restaurantController');
const { authenticateAdmin } = require('../../middlewares/authMiddleware');

// Get all restaurants with filters and pagination
router.get('/restaurants',authenticateAdmin, restaurantController.getAllRestaurants);

// Get restaurant statistics
router.get('/restaurants/stats',authenticateAdmin, restaurantController.getRestaurantStats);

// Get cuisine types for filter
router.get('/restaurants/cuisines',authenticateAdmin, restaurantController.getCuisineTypes);

// Get single restaurant details
router.get('/restaurants/:id',authenticateAdmin, restaurantController.getRestaurantById);

// Update restaurant status (Approve/Reject/Block/Unblock/Inactive)
router.put('/restaurants/:id/status',authenticateAdmin, restaurantController.updateRestaurantStatus);

module.exports = router;
