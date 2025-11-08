const router = require('express').Router();
const cart = require('../../controllers/customer/cartController');
const { authenticateUser } = require('../../middlewares/authMiddleware');

// Get user's active cart
// GET /api/cart/active?userId=xxx
router.get('/active',authenticateUser, cart.getActiveCart);

// Add item (with restaurant conflict detection)
// POST /api/cart/items
// Body: { userId, foodId, quantity, selectedAddOns }
router.post('/items',authenticateUser, cart.addItem);

// Clear cart and start fresh
// POST /api/cart/clear-and-add
// Body: { userId, foodId, quantity, selectedAddOns }
router.post('/clear-and-add',authenticateUser, cart.clearCartAndAddItem);

// Update item quantity
// PUT /api/cart/items/:id
// Body: { userId, quantity }
router.put('/items/:id',authenticateUser, cart.updateItem);

// Remove item from cart
// DELETE /api/cart/items/:id
// Body: { userId }
router.delete('/items/:id',authenticateUser, cart.removeItem);

// Cart summary
// GET /api/cart/summary/:cartId?userId=xxx
router.get('/summary/:cartId',authenticateUser, cart.summary);

// Validate cart before checkout (IMPORTANT)
// GET /api/cart/validate/:cartId?userId=xxx
router.get('/validate/:cartId',authenticateUser, cart.validateCart);

module.exports = router;