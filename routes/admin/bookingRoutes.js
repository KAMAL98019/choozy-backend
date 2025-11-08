const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/BookingController');
const { authenticateAdmin } = require("../../middlewares/authMiddleware");


// Get all bookings
router.get('/bookings',authenticateAdmin, adminController.getAllBookings);

// Get booking details (view only)
router.get('/bookings/:id',authenticateAdmin, adminController.getBookingById);

// Get booking statistics
router.get('/bookings/stats',authenticateAdmin, adminController.getBookingStats);
// ========================================
// EVENT APPROVAL ROUTES
// ========================================

// Get all pending events awaiting approval
router.get('/events/pending',authenticateAdmin, adminController.getPendingEvents);

// Get single event for approval review
router.get('/events/approval/:id',authenticateAdmin, adminController.getEventForApproval);

// Approve event
router.put('/events/approve/:id',authenticateAdmin, adminController.approveEvent);

// Reject event with reason
router.put('/events/reject/:id',authenticateAdmin, adminController.rejectEvent);

// ========================================
// EVENT MANAGEMENT ROUTES
// ========================================

// Get all events (approved + rejected)
router.get('/events',authenticateAdmin, adminController.getAllEvents);

// Get event statistics
router.get('/events/stats',authenticateAdmin, adminController.getEventStats);




module.exports = router;
