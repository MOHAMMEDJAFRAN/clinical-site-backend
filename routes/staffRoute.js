// routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const {
  createStaff,
  getStaffByClinic,
  getStaffById,
  updateStaff,
  deleteStaff,
  searchStaff
} = require('../controllers/admin/staffController');

// @route   POST /api/staff/:clinicId
// @desc    Create new staff member
// @access  Public
router.post('/create/:clinicId', createStaff);

// @route   GET /api/staff/:clinicId
// @desc    Get all staff members for a clinic
// @access  Public
router.get('/all/:clinicId', getStaffByClinic);

// @route   GET /api/staff/:clinicId/search
// @desc    Search staff members
// @access  Public
router.get('/:clinicId/search', searchStaff);

// @route   GET /api/staff/:clinicId/:staffId
// @desc    Get single staff member
// @access  Public
router.get('/:clinicId/:staffId', getStaffById);

// @route   PUT /api/staff/:clinicId/:staffId
// @desc    Update staff member
// @access  Public
router.put('/:clinicId/:staffId', updateStaff);

// @route   DELETE /api/staff/:clinicId/:staffId
// @desc    Delete staff member
// @access  Public
router.delete('/:clinicId/:staffId', deleteStaff);

module.exports = router;