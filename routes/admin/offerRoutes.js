// routes/offerRoutes.js
const express = require('express');
const router = express.Router();
const adminOfferController = require('../../controllers/admin/offerController');
const upload = require("../../middlewares/upload"); // multer config file

// ============ ADMIN ROUTES (Approval) ============
router.get('/admin/offers/pending', adminOfferController.getPendingOffers);
router.get('/admin/offers', adminOfferController.getAllOffers);
router.get('/admin/offers/:id', adminOfferController.getOfferDetails);
router.put('/admin/offers/:id/approve', adminOfferController.approveOffer);
router.put('/admin/offers/:id/reject', adminOfferController.rejectOffer);
router.put('/admin/offers/:id/request-changes', adminOfferController.requestChanges);

// ============ ADMIN CREATES OFFERS DIRECTLY ============
router.post('/admin/offers/create',upload.single('offerImage'), adminOfferController.createOfferByAdmin);
router.get('/admin/offers/admin-created', adminOfferController.getAdminOffers);
router.put('/admin/offers/admin-created/:id',upload.single('offerImage'), adminOfferController.updateAdminOffer);
router.delete('/admin/offers/admin-created/:id', adminOfferController.deleteAdminOffer);


module.exports = router;

