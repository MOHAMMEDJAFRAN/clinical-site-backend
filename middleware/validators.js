const { check } = require('express-validator');
const { body } = require('express-validator');

exports.profileValidator = [
  check('clinicName', 'Clinic name is required').not().isEmpty(),
  check('address', 'Address is required').not().isEmpty(),
  check('city', 'City is required').not().isEmpty(),
  check('phoneNumber', 'Phone number is required').not().isEmpty(),
  check('inchargeName', 'Incharge name is required').not().isEmpty()
];

exports.emailValidator = [
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('clinicId')
      .notEmpty().withMessage('Clinic ID is required')
      .isMongoId().withMessage('Invalid Clinic ID')
];
  
  // passwordValidator middleware example
exports.passwordValidator = [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    body('clinicId')
      .notEmpty().withMessage('Clinic ID is required')
      .isMongoId().withMessage('Invalid Clinic ID')
];