const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/admin/clinicDashboard.controller');
const paymentController = require('../controllers/admin/paymentController');

// Dashboard summary route
router.get('/clinic', dashboardController.getDashboardData);

// Appointment routes
router.route('/appointments/:appointmentId')
  .get(dashboardController.getAppointmentDetails)
  .patch(dashboardController.updateAppointmentStatus);

// Payment routes for appointments
router.route('/:appointmentId/payments')
  .post(paymentController.createPayment);

// Specific payment operations
router.route('/payments/:paymentId')
  .get(paymentController.getPaymentDetails);

module.exports = router;