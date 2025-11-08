const express = require('express');
const router = express.Router();
const Controller = require('../../controllers/restaurant/restaurantBookingController');
const uploadDiningSpace = require('../../middlewares/uploadDiningSpace');
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");

// Example correct usage:
router.get('/bookings/:restaurantId',authenticateRestaurant, Controller.getRestaurantBookings);
router.get('/bookings/:id',authenticateRestaurant, Controller.getBookingDetails);
router.put('/bookings/:id/accept',authenticateRestaurant, Controller.acceptBooking); // ✅
router.put('/bookings/:id/reject',authenticateRestaurant, Controller.rejectBooking);
router.put('/bookings/:id/seated',authenticateRestaurant, Controller.markSeated);
router.put('/bookings/:id/complete',authenticateRestaurant, Controller.completeBooking);

// Dining spaces
router.get('/dining-spaces/:restaurantId',authenticateRestaurant, Controller.getDiningSpaces);
router.post('/dining-spaces',uploadDiningSpace,authenticateRestaurant, Controller.createDiningSpace);
router.put('/dining-spaces/:id',uploadDiningSpace,authenticateRestaurant, Controller.updateDiningSpace);
router.delete('/dining-spaces/:id',authenticateRestaurant, Controller.deleteDiningSpace);

// Events
router.get('/events/:restaurantId',authenticateRestaurant, Controller.getEvents);
router.post('/events',authenticateRestaurant, Controller.createEvent);
router.put('/events/:id',authenticateRestaurant, Controller.updateEvent);
router.delete('/events/:id',authenticateRestaurant, Controller.deleteEvent);

module.exports = router;
