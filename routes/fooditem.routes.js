const router = require('express').Router();
const ctrl = require('../controllers/fooditem.controller');
const upload = require('../middlewares/upload'); // ✅ add this

// ✅ Create with image upload
router.post('/', upload.single('dishimage'), ctrl.create);

// ✅ Update with image upload
router.put('/:id', upload.single('dishimage'), ctrl.update);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.delete('/:id', ctrl.remove);

module.exports = router;
