'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/restaurant.controller');
const upload = require("../middlewares/uploadRestaurant");


// CRUD + search
router.post('/',upload.fields([
    { name: "rest_logo", maxCount: 1 },
    { name: "fssai_certificate", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 }
  ]), ctrl.create);
router.get('/', ctrl.list); // supports ?q=&cuisine=&minCost=&maxCost=&page=&pageSize=
router.get('/:id', ctrl.getById);
router.put('/:id',upload.fields([
    { name: "rest_logo", maxCount: 1 },
    { name: "fssai_certificate", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 }
  ]), ctrl.update);
router.delete('/:id', ctrl.remove);

// ✅ Get all active food items for a restaurant (only if ONLINE)
router.get('/:id/foods', ctrl.getRestaurantFoods);


router.post("/login", ctrl.login);
router.post("/logout", ctrl.logout);

// Forgot password flow routes
router.post('/forgot-password/send-otp', ctrl.sendOTP);
router.post('/forgot-password/verify-otp', ctrl.verifyOTP);
router.post('/forgot-password/reset-password', ctrl.resetPassword);
router.post('/forgot-password/resend-otp', ctrl.resendOTP);

// PUT - Update delivery settings for a restaurant
router.put("/:id/delivery-settings",ctrl.updateDeliverySettings);







module.exports = router;
