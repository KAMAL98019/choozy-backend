const express = require('express');
const router = express.Router();
const deliveryPartnerController = require('../../controllers/admin/deliveryPartnerController');
// const { authenticate, isAdmin } = require('../../middleware/auth');

// Get all delivery partners with filters and pagination
router.get('/delivery-partners', deliveryPartnerController.getAllPartners);

// Get partner statistics
router.get('/delivery-partners/stats', deliveryPartnerController.getPartnerStats);

// Get vehicle types for filter
router.get('/delivery-partners/vehicles', deliveryPartnerController.getVehicleTypes);

// Get single partner details
router.get('/delivery-partners/:id', deliveryPartnerController.getPartnerById);

// Update partner status (Approve/Reject/Block/Activate)
router.put('/delivery-partners/:id/status', deliveryPartnerController.updatePartnerStatus);

// Get partner attendance log
router.get('/delivery-partners/:partnerId/attendance', deliveryPartnerController.getPartnerAttendance);

// Download attendance report
router.get('/delivery-partners/:partnerId/attendance/download', deliveryPartnerController.downloadAttendanceReport);


module.exports = router;

