const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/admin/doctorConroller');
const upload = require('../utils/doc.img');


// 🔄 Doctor CRUD Routes

// Create a new doctor for a clinic
router.post(
  '/newDoc/:merchantId',
  upload.single('photo'),
  doctorController.createDoctor
);

// Get all doctors for a clinic
router.get(
  '/allDoc/:merchantId',
  doctorController.getDoctorsByClinic
);

// Get a specific doctor's details
router.get(
  '/doc/:id',
  doctorController.getDoctorDetails
);

// Update a doctor's full profile
router.put(
  '/update/:id',
  upload.single('photo'),
  doctorController.updateDoctor
);

// Delete a doctor
router.delete(
  '/del/:id',
  doctorController.deleteDoctor
);

// 🔄 Doctor Availability Routes

// Get all active shifts for a doctor
router.get(
  '/:id/shifts',
  doctorController.getDoctorShifts
);

// Get doctor availability for a specific date
router.get(
  '/:id/availability',
  doctorController.getDoctorAvailability
);

// 🔄 Shift Management Routes (New)

// Add shifts for a doctor
router.post(
  '/:id/shifts',
  doctorController.addDoctorShifts 
);

// Remove specific shifts from a doctor
router.delete(
  '/delShift/:id',
  doctorController.removeDoctorShifts
);
//update shift for specify doctor
router.patch('/update/:id/shifts', 
    doctorController.updateDoctorShifts
  );
// Replace all shifts for specific dates
router.put(
  '/allShift/:id/shifts',
  doctorController.replaceDoctorShifts
);

module.exports = router;