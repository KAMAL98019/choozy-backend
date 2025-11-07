const express = require('express');
const router = express.Router();
const deliveryPartnerController = require('../../controllers/admin/deliveryPartnerController');
const { authenticateAdmin } = require('../../middlewares/authMiddleware');

// Get all delivery partners with filters and pagination
router.get('/delivery-partners',authenticateAdmin, deliveryPartnerController.getAllPartners);

// Get partner statistics
router.get('/delivery-partners/stats',authenticateAdmin, deliveryPartnerController.getPartnerStats);

// Get vehicle types for filter
router.get('/delivery-partners/vehicles',authenticateAdmin, deliveryPartnerController.getVehicleTypes);

// Get single partner details
router.get('/delivery-partners/:id',authenticateAdmin, deliveryPartnerController.getPartnerById);

// Update partner status (Approve/Reject/Block/Activate)
router.put('/delivery-partners/:id/status',authenticateAdmin, deliveryPartnerController.updatePartnerStatus);

// Get partner attendance log
router.get('/delivery-partners/:partnerId/attendance',authenticateAdmin, deliveryPartnerController.getPartnerAttendance);

// Download attendance report
router.get('/delivery-partners/:partnerId/attendance/download',authenticateAdmin, deliveryPartnerController.downloadAttendanceReport);


module.exports = router;

