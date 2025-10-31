const express = require('express');
const router = express.Router();
const Controller = require('../controllers/restaurantBookingController');
const uploadDiningSpace = require('../middlewares/uploadDiningSpace');

// Example correct usage:
router.get('/bookings/:restaurantId', Controller.getRestaurantBookings);
router.get('/bookings/:id', Controller.getBookingDetails);
router.put('/bookings/:id/accept', Controller.acceptBooking); // ✅
router.put('/bookings/:id/reject', Controller.rejectBooking);
router.put('/bookings/:id/seated', Controller.markSeated);
router.put('/bookings/:id/complete', Controller.completeBooking);

// Dining spaces
router.get('/dining-spaces/:restaurantId', Controller.getDiningSpaces);
router.post('/dining-spaces',uploadDiningSpace, Controller.createDiningSpace);
router.put('/dining-spaces/:id',uploadDiningSpace, Controller.updateDiningSpace);
router.delete('/dining-spaces/:id', Controller.deleteDiningSpace);

// Events
router.get('/events/:restaurantId', Controller.getEvents);
router.post('/events', Controller.createEvent);
router.put('/events/:id', Controller.updateEvent);
router.delete('/events/:id', Controller.deleteEvent);

module.exports = router;
