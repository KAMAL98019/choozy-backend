const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');

// Create
router.post('/offers', offerController.createOffer);

// List (optionally filter by restaurantId/status)
router.get('/offers', offerController.getOffers);

// Get one
router.get('/offers/:id', offerController.getOfferById);

// Update
router.put('/offers/:id', offerController.updateOffer);

// Delete
router.delete('/offers/:id', offerController.deleteOffer);

module.exports = router;
