const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/BookingController');


// Get all bookings
router.get('/bookings', adminController.getAllBookings);

// Get booking details
router.get('/bookings/:id', adminController.getBookingById);

// Verify booking (send to restaurant)
router.put('/bookings/verify/:eventId', adminController.verifyEvent );

// Modify booking
router.put('/bookings/:id/modify', adminController.modifyBooking);

// Cancel booking
router.put('/bookings/:id/cancel', adminController.cancelBooking);

// Change booking status
router.put('/bookings/:id/status', adminController.changeBookingStatus);

// Get booking statistics
router.get('/bookings/stats', adminController.getBookingStats);

module.exports = router;
