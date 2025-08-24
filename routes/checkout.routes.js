const router = require('express').Router();
const checkout = require('../controllers/checkoutController');

router.post('/checkout/proceed', checkout.proceedToPay);
router.post('/checkout/:orderId/paid', checkout.markPaid);
router.get('/orders/:id', checkout.getOrder);
router.post('/orders/:id/cancel', checkout.cancelOrder);

module.exports = router;
