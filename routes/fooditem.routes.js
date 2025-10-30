const router = require('express').Router();
const ctrl = require('../controllers/fooditem.controller');
const uploadFood = require('../middlewares/uploadFood');

router.post('/', uploadFood.single('dishimage'), ctrl.create);
router.put('/:id', uploadFood.single('dishimage'), ctrl.update);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.delete('/:id', ctrl.remove);

module.exports = router;
