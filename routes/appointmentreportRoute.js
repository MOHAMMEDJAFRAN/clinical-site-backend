const express = require('express');
const router = express.Router();
const appointmentReportController = require('../controllers/super_admin/appointmentreportController');

// Get appointment report with filters
router.get('/report', appointmentReportController.getAppointmentReport);

// Get appointment statistics
router.get('/stats', appointmentReportController.getAppointmentStats);

module.exports = router;