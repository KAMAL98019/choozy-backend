// routes/admin/offerRoutes.js
const express = require('express');
const router = express.Router();
const adminOfferController = require('../../controllers/admin/offerController');
const upload = require("../../middlewares/uploadOffer");

// ============================================
// CRITICAL: Specific routes MUST come BEFORE :id routes!
// ============================================

// ============ ADMIN CREATES OFFERS (Specific routes FIRST!) ============
router.post('/offers/admin-create', upload.single('offerImage'), adminOfferController.createOfferByAdmin);
router.get('/offers/admin-created', adminOfferController.getAdminOffers);
router.get('/offers/admin-created/:id', adminOfferController.getAdminOfferById); // ✅ Fixed: was calling getAdminOffers
router.put('/offers/admin-created/:id', upload.single('offerImage'), adminOfferController.updateAdminOffer);
router.delete('/offers/admin-created/:id', adminOfferController.deleteAdminOffer);

// ============ RESTAURANT OFFER APPROVAL ============
router.get('/offers/pending', adminOfferController.getPendingOffers);
router.put('/offers/:id/approve', adminOfferController.approveOffer);
router.put('/offers/:id/reject', adminOfferController.rejectOffer);
router.put('/offers/:id/request-changes', adminOfferController.requestChanges);

// ============ GENERAL ROUTES (These MUST be last!) ============
router.get('/offers', adminOfferController.getAllOffers);
router.get('/offers/:id', adminOfferController.getOfferDetails);

module.exports = router;