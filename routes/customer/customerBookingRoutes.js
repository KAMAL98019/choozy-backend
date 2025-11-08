const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/customer/customerBookingController');
const { authenticateUser } = require('../../middlewares/authMiddleware');


// Get all restaurants
router.get('/restaurants',authenticateUser, customerController.getRestaurants);

// Get restaurant details
router.get('/restaurants/:id',authenticateUser, customerController.getRestaurantDetails);

// Get available time slots
router.get('/restaurants/:id/slots',authenticateUser, customerController.getAvailableTimeSlots);

// Create booking
router.post('/bookings',authenticateUser, customerController.createBooking);

// Get my bookings
router.get('/bookings',authenticateUser, customerController.getMyBookings);

// Get booking details
router.get('/bookings/:id',authenticateUser, customerController.getBookingDetails);

// Cancel booking
router.put('/bookings/:id/cancel',authenticateUser, customerController.cancelBooking);

module.exports = router;

