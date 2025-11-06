// routes/admin/offerRoutes.js
const express = require('express');
const router = express.Router();
const adminOfferController = require('../../controllers/admin/offerController');
const upload = require("../../middlewares/uploadOffer");

// ============================================
// CRITICAL: Specific routes MUST come BEFORE :id routes!
// ============================================

// ============ ADMIN CREATES OFFERS (Specific routes FIRST!) ============
router.post('/admin/offers/admin-create', upload.single('offerImage'), adminOfferController.createOfferByAdmin);
router.get('/admin/offers/admin-created', adminOfferController.getAdminOffers);
router.get('/admin/offers/admin-created/:id', adminOfferController.getAdminOfferById); // ✅ Fixed: was calling getAdminOffers
router.put('/admin/offers/admin-created/:id', upload.single('offerImage'), adminOfferController.updateAdminOffer);
router.delete('/admin/offers/admin-created/:id', adminOfferController.deleteAdminOffer);

// ============ RESTAURANT OFFER APPROVAL ============
router.get('/admin/offers/pending', adminOfferController.getPendingOffers);
router.put('/admin/offers/:id/approve', adminOfferController.approveOffer);
router.put('/admin/offers/:id/reject', adminOfferController.rejectOffer);
router.put('/admin/offers/:id/request-changes', adminOfferController.requestChanges);

// ============ GENERAL ROUTES (These MUST be last!) ============
router.get('/admin/offers', adminOfferController.getAllOffers);
router.get('/admin/offers/:id', adminOfferController.getOfferDetails);

module.exports = router;