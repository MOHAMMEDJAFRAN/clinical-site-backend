const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController');
// const authMiddleware = require("../middleware/authMiddleware")

// Unified login route for all roles
router.post('/login', authController.unifiedLogin);

module.exports = router;