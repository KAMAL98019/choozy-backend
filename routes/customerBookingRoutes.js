const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerBookingController');


// Get all restaurants
router.get('/restaurants', customerController.getRestaurants);

// Get restaurant details
router.get('/restaurants/:id', customerController.getRestaurantDetails);

// Get available time slots
router.get('/restaurants/:id/slots', customerController.getAvailableTimeSlots);

// Create booking
router.post('/bookings', customerController.createBooking);

// Get my bookings
router.get('/bookings', customerController.getMyBookings);

// Get booking details
router.get('/bookings/:id', customerController.getBookingDetails);

// Cancel booking
router.put('/bookings/:id/cancel', customerController.cancelBooking);

module.exports = router;

