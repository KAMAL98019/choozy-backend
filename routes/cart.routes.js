const router = require('express').Router();
const cart = require('../controllers/cartController');

router.get('/carts/active/:userId', cart.getActiveCart);
router.post('/carts/ensure', cart.ensureCart);
router.post('/carts/items', cart.addItem);
router.put('/carts/items/:id', cart.updateItem);
router.delete('/carts/items/:id', cart.removeItem);
router.get('/carts/:cartId/summary', cart.summary);

module.exports = router;
