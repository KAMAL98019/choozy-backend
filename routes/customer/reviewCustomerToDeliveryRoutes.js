const express = require('express');
const router = express.Router();
const controller = require('../../controllers/customer/reviewCustomerToDeliveryController');
const { authenticateUser } = require('../../middlewares/authMiddleware');

router.post('/',authenticateUser ,controller.create);
router.get('/', authenticateUser ,controller.getAll);
router.get('/:id',authenticateUser , controller.getById);
router.put('/:id', authenticateUser ,controller.update);
router.delete('/:id',authenticateUser , controller.delete);

module.exports = router;
