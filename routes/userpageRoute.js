'use client'
// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/user/docViewController');
const appointmentController = require('../controllers/user/appointment.controller');
const shiftTimeController = require('../controllers/user/shiftTime.controller');
const availabilityController = require('../controllers/user/availability.controller'); 

// Get all doctors with optional filters
router.get('/doctors', doctorController.getAllDoctors);

// Get single doctor by ID
router.get('/:id', doctorController.getDoctorById);

// Check appointment availability
router.post('/check-availability', availabilityController.checkAvailability); // New route

// Get shift times for a doctor on a specific date
router.get('/:doctorId/shift-times/:date', shiftTimeController.getShiftTimesByDoctorAndDate);

router.get('/cities/clinics', doctorController.getClinicCities);

// Create new appointment
router.post('/appointments/create', appointmentController.createAppointment);

// Get appointment by reference number
router.get('/appointments/:reference', appointmentController.getAppointmentByReference);

module.exports = router;