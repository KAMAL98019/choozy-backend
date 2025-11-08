// routes/admin/offerRoutes.js
const express = require('express');
const router = express.Router();
const adminOfferController = require('../../controllers/admin/offerController');
const upload = require("../../middlewares/uploadOffer");
const { authenticateAdmin } = require("../../middlewares/authMiddleware");

// ============================================
// CRITICAL: Specific routes MUST come BEFORE :id routes!
// ============================================

// ============ ADMIN CREATES OFFERS (Specific routes FIRST!) ============
router.post('/offers/admin-create',authenticateAdmin, upload.single('offerImage'), adminOfferController.createOfferByAdmin);
router.get('/offers/admin-created',authenticateAdmin, adminOfferController.getAdminOffers);
router.get('/offers/admin-created/:id',authenticateAdmin, adminOfferController.getAdminOfferById); // ✅ Fixed: was calling getAdminOffers
router.put('/offers/admin-created/:id',authenticateAdmin, upload.single('offerImage'), adminOfferController.updateAdminOffer);
router.delete('/offers/admin-created/:id',authenticateAdmin, adminOfferController.deleteAdminOffer);

// ============ RESTAURANT OFFER APPROVAL ============
router.get('/offers/pending',authenticateAdmin, adminOfferController.getPendingOffers);
router.put('/offers/:id/approve',authenticateAdmin, adminOfferController.approveOffer);
router.put('/offers/:id/reject',authenticateAdmin, adminOfferController.rejectOffer);
router.put('/offers/:id/request-changes',authenticateAdmin, adminOfferController.requestChanges);

// ============ GENERAL ROUTES (These MUST be last!) ============
router.get('/offers',authenticateAdmin, adminOfferController.getAllOffers);
router.get('/offers/:id',authenticateAdmin, adminOfferController.getOfferDetails);

module.exports = router;