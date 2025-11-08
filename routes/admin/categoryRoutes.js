const router = require('express').Router();
const ctrl = require('../../controllers/admin/categoryController');
const { authenticateAdmin } = require("../../middlewares/authMiddleware");

router.post('/',authenticateAdmin, ctrl.create);
router.get('/',authenticateAdmin, ctrl.getAll);
router.get('/:id',authenticateAdmin, ctrl.getById);
router.put('/:id',authenticateAdmin, ctrl.update);
router.delete('/:id',authenticateAdmin, ctrl.remove);

module.exports = router;
