const express = require('express');
const router = express.Router();
const restaurantController = require('../../controllers/admin/restaurantController');
// const { authenticate, isAdmin } = require('../../middleware/auth');

// Get all restaurants with filters and pagination
router.get('/restaurants', restaurantController.getAllRestaurants);

// Get restaurant statistics
router.get('/restaurants/stats', restaurantController.getRestaurantStats);

// Get cuisine types for filter
router.get('/restaurants/cuisines', restaurantController.getCuisineTypes);

// Get single restaurant details
router.get('/restaurants/:id', restaurantController.getRestaurantById);

// Update restaurant status (Approve/Reject/Block/Unblock)
router.put('/restaurants/:id/status', restaurantController.updateRestaurantStatus);




module.exports = router;
