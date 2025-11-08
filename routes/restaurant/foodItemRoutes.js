const router = require('express').Router();
const ctrl = require('../../controllers/restaurant/fooditemController');
const uploadFood = require('../../middlewares/uploadFood');
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");
const { authenticateUser } = require("../../middlewares/authMiddleware");


router.post('/',authenticateRestaurant , uploadFood.single('dishimage'), ctrl.create);
router.put('/:id',authenticateRestaurant , uploadFood.single('dishimage'), ctrl.update);

router.get('/',ctrl.getAll);
router.get('/:id',authenticateRestaurant , ctrl.getById);
router.delete('/:id',authenticateRestaurant , ctrl.remove);

module.exports = router;
