const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const upload = require("../middlewares/upload"); // file upload middleware

// Customer: Track order & partner
router.get('/orders/:orderId/tracking', trackingController.trackOrder);

// Partner: Update status and location (heading to restaurant, pickup, delivery)
router.put('/delivery/:assignmentId/trackingStatus', trackingController.updateDeliveryStatus);

router.put('/delivery/:assignmentId/complete',upload.single('deliveryPhoto'),trackingController.completeDelivery);

module.exports = router;
