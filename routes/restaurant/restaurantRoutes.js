// ==================== routes/restaurant.routes.js ====================
const express = require("express");
const router = express.Router();
const ctrl = require('../../controllers/restaurant/restaurantController');
const upload = require("../../middlewares/uploadRestaurant");
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");
const { authenticateUser } = require("../../middlewares/authMiddleware");

// ============= PUBLIC ROUTES (No JWT Required) =============
router.post("/", upload.fields([
    { name: "rest_logo", maxCount: 1 },
    { name: "fssai_certificate", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 }
]), ctrl.create);
router.post("/login", ctrl.login);
router.post('/forgot-password/send-otp', ctrl.sendOTP);
router.post('/forgot-password/verify-otp', ctrl.verifyOTP);
router.post('/forgot-password/reset-password', ctrl.resetPassword);
router.post('/forgot-password/resend-otp', ctrl.resendOTP);

// Public listing (customers can see restaurants)
router.get('/',authenticateUser,ctrl.list);
router.get('/:id',authenticateRestaurant,ctrl.getById);
router.get('/:id/foods',authenticateUser, ctrl.getRestaurantFoods);

// ============= PROTECTED ROUTES (JWT Required) =============
router.post("/logout", authenticateRestaurant, ctrl.logout);
router.put('/:id', authenticateRestaurant, upload.fields([
    { name: "rest_logo", maxCount: 1 },
    { name: "fssai_certificate", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 }
]), ctrl.update);
router.delete('/:id', authenticateRestaurant, ctrl.remove);
router.put("/:id/delivery-settings", authenticateRestaurant, ctrl.updateDeliverySettings);

module.exports = router;