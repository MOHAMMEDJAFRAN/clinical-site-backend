const ClinicalCenter = require('../../models/clinical.model');
const { sendEmail } = require('../../services/emailService');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const asyncHadler = require('express-async-handler')

/**
 * @desc    Create new clinical center
 * @route   POST /api/v1/clinical-centers
 * @access  Private/Admin
 */
exports.createClinicalCenter = asyncHadler(async (req, res, next) => {
  // 1) Check if email already exists
  const existingCenter = await ClinicalCenter.findOne({ email: req.body.email });
  if (existingCenter) {
    return next(new AppError('Email already in use', 400));
  }

  // 2) Generate password if not provided
  if (!req.body.password) {
    req.body.password = ClinicalCenter.generateRandomPassword();
  }

  // 3) Create clinical center
  const clinicalCenter = await ClinicalCenter.create(req.body);

  // 4) Send welcome email with credentials
  try {
    await sendEmail({
      email: clinicalCenter.email,
      subject: 'Your Clinical Center Account Credentials',
      template: 'welcomeClinicalCenter',
      context: {
        name: clinicalCenter.inChargeName,
        clinicName: clinicalCenter.clinicName,
        email: clinicalCenter.email,
        password: req.body.password // Only available here before hashing
      }
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err);
    // Continue even if email fails
  }

  // 5) Remove password from output
  clinicalCenter.password = undefined;

  // 6) Send response
  res.status(201).json({
    status: 'success',
    data: {
      clinicalCenter
    }
  });
});

/**
 * @desc    Get all clinical centers
 * @route   GET /api/v1/clinical-centers
 * @access  Private/Admin
 */
exports.getAllClinicalCenters = asyncHadler(async (req, res, next) => {
  // 1) Filtering, Sorting, Pagination (can be enhanced)
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  let query = ClinicalCenter.find(queryObj).select('-password');

  // 2) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // 3) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // 4) Execute query
  const clinicalCenters = await query;

  res.status(200).json({
    status: 'success',
    results: clinicalCenters.length,
    data: {
      clinicalCenters
    }
  });
});

/**
 * @desc    Get single clinical center
 * @route   GET /api/v1/clinical-centers/:id
 * @access  Private/Admin
 */
exports.getClinicalCenter = asyncHadler(async (req, res, next) => {
  const clinicalCenter = await ClinicalCenter.findById(req.params.id).select('-password');

  if (!clinicalCenter) {
    return next(new AppError('No clinical center found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      clinicalCenter
    }
  });
});

/**
 * @desc    Update clinical center
 * @route   PATCH /api/v1/clinical-centers/:id
 * @access  Private/Admin
 */
exports.updateClinicalCenter = asyncHadler(async (req, res, next) => {
  // 1) Don't allow password updates through this route
  if (req.body.password) {
    delete req.body.password;
  }

  // 2) Check if email is being updated and if it's already in use
  if (req.body.email) {
    const existingCenter = await ClinicalCenter.findOne({ 
      email: req.body.email,
      _id: { $ne: req.params.id }
    });
    
    if (existingCenter) {
      return next(new AppError('Email already in use', 400));
    }
  }

  // 3) Update clinical center
  const clinicalCenter = await ClinicalCenter.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!clinicalCenter) {
    return next(new AppError('No clinical center found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      clinicalCenter
    }
  });
});

/**
 * @desc    Delete (deactivate) clinical center
 * @route   DELETE /api/v1/clinical-centers/:id
 * @access  Private/Admin
 */
exports.deleteClinicalCenter = asyncHadler(async (req, res, next) => {
  // Soft delete by setting isActive to false
  const clinicalCenter = await ClinicalCenter.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  ).select('-password');

  if (!clinicalCenter) {
    return next(new AppError('No clinical center found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Generate new password for clinical center
 * @route   POST /api/v1/clinical-centers/:id/generate-password
 * @access  Private/Admin
 */
exports.generateNewPassword = asyncHadler(async (req, res, next) => {
  // 1) Generate new password
  const newPassword = ClinicalCenter.generateRandomPassword();

  // 2) Hash the password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // 3) Update clinical center with new password
  const clinicalCenter = await ClinicalCenter.findByIdAndUpdate(
    req.params.id,
    { password: hashedPassword },
    { new: true }
  ).select('-password');

  if (!clinicalCenter) {
    return next(new AppError('No clinical center found with that ID', 404));
  }

  // 4) Send email with new password
  try {
    await sendEmail({
      email: clinicalCenter.email,
      subject: 'Your New Password',
      template: 'passwordReset',
      context: {
        name: clinicalCenter.inChargeName,
        newPassword
      }
    });
  } catch (err) {
    console.error('Failed to send password email:', err);
    // Continue even if email fails
  }

  res.status(200).json({
    status: 'success',
    message: 'New password generated and sent to the clinical center email',
    data: {
      clinicalCenter
    }
  });
});