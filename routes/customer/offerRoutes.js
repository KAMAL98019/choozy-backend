// routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const customerOfferController = require('../../controllers/customer/customerOfferController');
const { authenticateUser } = require('../../middlewares/authMiddleware');


// Get active offers (with optional restaurant and category filters)
// GET /api/customer/offers?restaurantId=xxx&categoryId=yyy
router.get('/customer/offers',authenticateUser, customerOfferController.getActiveOffers);

// Get single offer details
// GET /api/customer/offers/:id
router.get('/customer/offers/:id',authenticateUser, customerOfferController.getOfferDetails);

// Get food items with applicable offers and calculated prices
// GET /api/customer/food-items-with-offers?restaurantId=xxx&categoryId=yyy
router.get('/customer/food-items-with-offers',authenticateUser, customerOfferController.getFoodItemsWithOffers);

// Calculate offer for a specific food item
// GET /api/customer/food-items/:foodItemId/calculate-offer
router.get('/customer/food-items/:foodItemId/calculate-offer',authenticateUser, customerOfferController.calculateOfferForItem);

// Get offers by restaurant and category
// GET /api/customer/offers-by-category?restaurantId=xxx&categoryId=yyy
router.get('/customer/offers-by-category',authenticateUser, customerOfferController.getOffersByRestaurantAndCategory);

// Book/claim an offer
// POST /api/customer/book-offer
// Body: { userId, offerId }
router.post('/customer/book-offer',authenticateUser, customerOfferController.bookOffer);

// Get user's booked offers
// GET /api/customer/booked-offers?userId=xxx&status=BOOKED
router.get('/customer/booked-offers',authenticateUser, customerOfferController.getUserBookedOffers);

// Cancel booked offer
// PUT /api/customer/booked-offers/:id/cancel
// Body: { userId }
router.put('/customer/booked-offers/:id/cancel',authenticateUser, customerOfferController.cancelBookedOffer);

module.exports = router;