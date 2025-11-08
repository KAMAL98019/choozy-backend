const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/customer/addressController');
const { authenticateUser } = require('../../middlewares/authMiddleware');

router.post('/addresses',authenticateUser , addressController.createAddress);
router.get('/addresses/:userId',authenticateUser , addressController.getAddresses);
router.put('/addresses/:id',authenticateUser , addressController.updateAddress);
router.delete('/addresses/:id',authenticateUser , addressController.deleteAddress);

module.exports = router;
