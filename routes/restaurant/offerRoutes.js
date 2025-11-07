// routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const restaurantOfferController = require('../../controllers/restaurant/restaurantOfferController');
const upload = require("../../middlewares/uploadOffer"); // multer config file


// ============ RESTAURANT ROUTES ============
router.post('/restaurant/offers',upload.single('offerImage'), restaurantOfferController.createOffer);
router.get('/restaurant/offers', restaurantOfferController.getRestaurantOffers);
router.get('/restaurant/offers/:id', restaurantOfferController.getOfferById);
router.put('/restaurant/offers/:id',upload.single('offerImage'), restaurantOfferController.updateOffer);
router.delete('/restaurant/offers/:id', restaurantOfferController.deleteOffer);


module.exports = router;