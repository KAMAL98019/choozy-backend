const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/customer/addressController');

router.post('/addresses', addressController.createAddress);
router.get('/addresses/:userId', addressController.getAddresses);
router.put('/addresses/:id', addressController.updateAddress);
router.delete('/addresses/:id', addressController.deleteAddress);

module.exports = router;
