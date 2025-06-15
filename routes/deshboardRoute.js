// routes/adminDashboardRoutes.js

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/super_admin/deshboardController');

// Dashboard statistics
router.get('/stats', adminDashboardController.getDashboardStats);

// Clinical centers management
router.get('/clinical-centers', adminDashboardController.getClinicalCenters);

// Pending queries
router.get('/queries/pending', adminDashboardController.getPendingQueries);

module.exports = router;