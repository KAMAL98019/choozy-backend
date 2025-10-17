// routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const restaurantOfferController = require('../controllers/restaurantOfferController');
const customerOfferController = require('../controllers/customerOfferController');
const upload = require("../middlewares/upload"); // multer config file


// ============ RESTAURANT ROUTES ============
router.post('/restaurant/offers',upload.single('offerImage'), restaurantOfferController.createOffer);
router.get('/restaurant/offers', restaurantOfferController.getRestaurantOffers);
router.get('/restaurant/offers/:id', restaurantOfferController.getOfferById);
router.put('/restaurant/offers/:id',upload.single('offerImage'), restaurantOfferController.updateOffer);
router.delete('/restaurant/offers/:id', restaurantOfferController.deleteOffer);


// ============ CUSTOMER ROUTES ============
router.get('/offers', customerOfferController.getActiveOffers);
router.get('/offers/:id', customerOfferController.getOfferDetails);
router.post('/user/offers/book', customerOfferController.bookOffer);
router.get('/user/offers', customerOfferController.getUserBookedOffers);
router.put('/user/offers/:id/use',customerOfferController.useOffer);
router.put('/user/offers/:id/cancel', customerOfferController.cancelBookedOffer);

module.exports = router;