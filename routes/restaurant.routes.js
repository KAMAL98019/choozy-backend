'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/restaurantController');

// CRUD + search
router.post('/', ctrl.create);
router.get('/', ctrl.list); // supports ?q=&cuisine=&minCost=&maxCost=&page=&pageSize=
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
