const router = require('express').Router();
const cart = require('../controllers/cart.controller');

router.get('/active/:userId/:restId', cart.getActiveCart);

router.post('/ensure', cart.ensureCart);
router.post('/items', cart.addItem);
router.put('/items/:id', cart.updateItem);
router.delete('/items/:id', cart.removeItem);
router.get('/summary/:cartId', cart.summary);

module.exports = router;
