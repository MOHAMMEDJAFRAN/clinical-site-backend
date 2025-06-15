const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/admin/outstandingController');

// Merchant details route
router.get('/merchants/:merchantId', appointmentController.getMerchantDetails);

// Clinic appointment routes
router.get('/clinics/:merchantId/appointments', appointmentController.getClinicAppointments);
router.post('/clinics/:merchantId/appointments', appointmentController.createClinicAppointment);
router.get('/clinics/:merchantId/appointments/:reference', appointmentController.getAppointmentByReference);

// Clinic doctor and shift time routes
router.get('/clinics/:merchantId/doctors', appointmentController.getClinicDoctors);
router.get('/clinics/:merchantId/doctors/:doctorId/shift-times', appointmentController.getDoctorShiftTimes);

module.exports = router;