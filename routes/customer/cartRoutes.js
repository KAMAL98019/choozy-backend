const router = require('express').Router();
const cart = require('../../controllers/customer/cartController');

// Get user's active cart
// GET /api/cart/active?userId=xxx
router.get('/active', cart.getActiveCart);

// Add item (with restaurant conflict detection)
// POST /api/cart/items
// Body: { userId, foodId, quantity, selectedAddOns }
router.post('/items', cart.addItem);

// Clear cart and start fresh
// POST /api/cart/clear-and-add
// Body: { userId, foodId, quantity, selectedAddOns }
router.post('/clear-and-add', cart.clearCartAndAddItem);

// Update item quantity
// PUT /api/cart/items/:id
// Body: { userId, quantity }
router.put('/items/:id', cart.updateItem);

// Remove item from cart
// DELETE /api/cart/items/:id
// Body: { userId }
router.delete('/items/:id', cart.removeItem);

// Cart summary
// GET /api/cart/summary/:cartId?userId=xxx
router.get('/summary/:cartId', cart.summary);

// Validate cart before checkout (IMPORTANT)
// GET /api/cart/validate/:cartId?userId=xxx
router.get('/validate/:cartId', cart.validateCart);

module.exports = router;