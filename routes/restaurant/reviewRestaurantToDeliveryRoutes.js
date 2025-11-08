const express = require('express');
const router = express.Router();
const controller = require('../../controllers/restaurant/reviewRestaurantToDeliveryController');
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");

router.post('/', authenticateRestaurant, controller.create);
router.get('/', authenticateRestaurant,controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', authenticateRestaurant,controller.update);
router.delete('/:id',authenticateRestaurant, controller.delete);

module.exports = router;

