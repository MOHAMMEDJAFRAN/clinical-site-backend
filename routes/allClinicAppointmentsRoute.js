const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/super_admin/allClinicAppointsment.controller');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// All routes are protected and require admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

// Admin routes
router.get('/clinics', appointmentController.getAllClinics);
router.get('/clinics/:clinicId/appointments', appointmentController.getClinicAppointments);
router.get('/clinics/:clinicId/filter', appointmentController.filterAppointments);
router.put('/:appointmentId/status', appointmentController.updateAppointmentStatus);

module.exports = router;