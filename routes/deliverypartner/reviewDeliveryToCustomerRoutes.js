const express = require('express');
const router = express.Router();
const controller = require('../../controllers/deliverypartner/reviewDeliveryToCustomerController');
const { authenticatePartner } = require("../../middlewares/authMiddleware");

router.post('/', authenticatePartner, controller.create);
router.get('/', authenticatePartner, controller.getAll);
router.get('/:id', authenticatePartner, controller.getById);
router.put('/:id', authenticatePartner, controller.update);
router.delete('/:id', authenticatePartner, controller.delete);

module.exports = router;
