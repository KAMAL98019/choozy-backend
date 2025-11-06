const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/BookingController');


// Get all bookings
router.get('/bookings', adminController.getAllBookings);

// Get booking details (view only)
router.get('/bookings/:id', adminController.getBookingById);

// Get booking statistics
router.get('/bookings/stats', adminController.getBookingStats);
// ========================================
// EVENT APPROVAL ROUTES
// ========================================

// Get all pending events awaiting approval
router.get('/events/pending', adminController.getPendingEvents);

// Get single event for approval review
router.get('/events/approval/:id', adminController.getEventForApproval);

// Approve event
router.put('/events/approve/:id', adminController.approveEvent);

// Reject event with reason
router.put('/events/reject/:id', adminController.rejectEvent);

// ========================================
// EVENT MANAGEMENT ROUTES
// ========================================

// Get all events (approved + rejected)
router.get('/events', adminController.getAllEvents);

// Get event statistics
router.get('/events/stats', adminController.getEventStats);




module.exports = router;
