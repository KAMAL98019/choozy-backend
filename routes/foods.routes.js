const router = require('express').Router();
const food = require('../controllers/foodController');

router.post('/foods', food.create);
router.get('/foods', food.list);
router.get('/foods/:id', food.get);
router.put('/foods/:id', food.update);
router.delete('/foods/:id', food.remove);

module.exports = router;
