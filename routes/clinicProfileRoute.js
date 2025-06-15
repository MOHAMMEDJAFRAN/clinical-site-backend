const express = require('express');
const router = express.Router();
const merchantProfileController = require('../controllers/admin/profile.Controller');
const { profileValidator, emailValidator, passwordValidator } = require('../middleware/validators');


// @route   GET /api/clinics/:clinicId
// @desc    Get clinic profile by ID
// @access  Private (Clinic Admin or System Admin)
router.get('/:clinicId', merchantProfileController.getProfile);

// @route   PUT /api/clinics/:clinicId
// @desc    Update clinic profile by ID
// @access  Private (Clinic Admin or System Admin)
router.put('/update/:clinicId', profileValidator, merchantProfileController.updateProfile);

// Alternative query parameter version
// @route   GET /api/clinics
// @desc    Get clinic profile by query parameter
// @access  Private (Clinic Admin or System Admin)
router.get('/', merchantProfileController.getProfile);

// @route   PUT /api/clinics
// @desc    Update clinic profile by query parameter
// @access  Private (Clinic Admin or System Admin)
router.put('/', profileValidator, merchantProfileController.updateProfile);

// User-specific routes (remain unchanged)
// @route   PUT /api/clinics/email
// @desc    Update user email
// @access  Private
router.put('/profile/email', emailValidator, merchantProfileController.updateEmail);

// @route   PUT /api/clinics/password
// @desc    Update user password
// @access  Private
router.put('/profile/password', passwordValidator, merchantProfileController.updatePassword);

module.exports = router;