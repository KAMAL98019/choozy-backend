const router = require('express').Router();
const ctrl = require('../../controllers/admin/cuisineController');
const { authenticateAdmin } = require("../../middlewares/authMiddleware");
const { authenticateRestaurant } = require("../../middlewares/authMiddleware");

router.post('/', ctrl.create);
router.get('/',authenticateRestaurant, ctrl.getAll);
router.get('/:id',authenticateAdmin, ctrl.getById);
router.put('/:id',authenticateAdmin, ctrl.update);
router.delete('/:id',authenticateAdmin, ctrl.remove);

module.exports = router;
