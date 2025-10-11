'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/restaurant.controller');
const upload = require("../middlewares/upload");


// CRUD + search
router.post('/',upload.fields([
    { name: "rest_logo", maxCount: 1 },
    { name: "fssai_certificate", maxCount: 1 },
    { name: "gst_certificate", maxCount: 1 }
  ]), ctrl.create);
router.get('/', ctrl.list); // supports ?q=&cuisine=&minCost=&maxCost=&page=&pageSize=
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);


router.post("/login", ctrl.login);
router.post("/reset-password", ctrl.resetPassword);

// PUT - Update delivery settings for a restaurant
router.put("/restaurants/:id/delivery-settings",ctrl.updateDeliverySettings);







module.exports = router;
