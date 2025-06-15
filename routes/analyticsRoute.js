// routes/appointmentReportRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAppointmentsReport,
  getFilteredAppointmentsReport,
  getAppointmentStats
} = require('../controllers/admin/analyticsController');

// GET /api/appointments-report/:clinicId - Get appointments report for a clinic
// Query params: startDate, endDate, status, doctorId
router.get('/:clinicId', getAppointmentsReport);

// GET /api/appointments-report/:clinicId/filtered - Get filtered appointments (for real-time filtering)
// Query params: startDate, endDate, status, doctorId
router.get('/:clinicId/filtered', getFilteredAppointmentsReport);

// GET /api/appointments-report/:clinicId/stats - Get appointment statistics
// Query params: period (today, week, month, year)
router.get('/:clinicId/stats', getAppointmentStats);

module.exports = router;