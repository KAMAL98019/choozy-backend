const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { authenticateAdmin } = require("../../middlewares/authMiddleware");


router.post('/login', adminController.login);

module.exports = router;
