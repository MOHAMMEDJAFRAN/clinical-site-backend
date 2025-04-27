const Admin = require('../../models/adminmodel');
const User = require('../../models/userModel');
const AppError = require('../../utils/appError');
const asyncHandler = require('../../utils/catchAsync');
const { uploadToCloudinary } = require('../../utils/cloudinary');

// @desc    Get current admin profile
// @route   GET /api/v1/admin/profile
// @access  Private/Admin
exports.getAdminProfile = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findOne({ user: req.user.id })
    .populate('userDetails', 'email role isVerified createdAt lastLoginAt');
  
  if (!admin) {
    return next(new AppError('Admin profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Update admin profile
// @route   PUT /api/v1/admin/profile
// @access  Private/Admin
exports.updateAdminProfile = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    phoneNumber: req.body.phoneNumber
  };

  const admin = await Admin.findOneAndUpdate(
    { user: req.user.id },
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  ).populate('userDetails', 'email role isVerified createdAt lastLoginAt');

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Update admin profile image
// @route   PUT /api/v1/admin/profile-image
// @access  Private/Admin
exports.updateProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.body.image) {
    return next(new AppError('Please upload an image', 400));
  }

  // Upload to Cloudinary (or your preferred storage)
  const result = await uploadToCloudinary(req.body.image, 'admin-profiles');

  const admin = await Admin.findOneAndUpdate(
    { user: req.user.id },
    { profileImage: result.secure_url },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Change admin password
// @route   PUT /api/v1/admin/change-password
// @access  Private/Admin
exports.changePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    data: {},
    message: 'Password changed successfully'
  });
});

// @desc    Get all admins (for superadmin only)
// @route   GET /api/v1/admin
// @access  Private/Superadmin
exports.getAdmins = asyncHandler(async (req, res, next) => {
  const admins = await Admin.find()
    .populate('userDetails', 'email role isVerified createdAt lastLoginAt')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: admins.length,
    data: admins
  });
});

// @desc    Create new admin (for superadmin only)
// @route   POST /api/v1/admin
// @access  Private/Superadmin
exports.createAdmin = asyncHandler(async (req, res, next) => {
  // First create user
  const user = await User.create({
    email: req.body.email,
    password: req.body.password,
    role: 'admin'
  });

  // Then create admin profile
  const admin = await Admin.create({
    user: user._id,
    name: req.body.name,
    phoneNumber: req.body.phoneNumber,
    adminType: req.body.adminType || 'admin',
    permissions: req.body.permissions || []
  });

  const populatedAdmin = await Admin.findById(admin._id)
    .populate('userDetails', 'email role isVerified createdAt lastLoginAt');

  res.status(201).json({
    success: true,
    data: populatedAdmin
  });
});

// @desc    Update admin (for superadmin only)
// @route   PUT /api/v1/admin/:id
// @access  Private/Superadmin
exports.updateAdmin = asyncHandler(async (req, res, next) => {
  let admin = await Admin.findById(req.params.id);

  if (!admin) {
    return next(new AppError(`Admin not found with id of ${req.params.id}`, 404));
  }

  // Prevent changing superadmin status if last superadmin
  if (req.body.adminType && req.body.adminType !== 'superadmin') {
    const superadminCount = await Admin.countDocuments({ adminType: 'superadmin' });
    if (superadminCount <= 1 && admin.adminType === 'superadmin') {
      return next(new AppError('Cannot remove the last superadmin', 400));
    }
  }

  admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('userDetails', 'email role isVerified createdAt lastLoginAt');

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Delete admin (for superadmin only)
// @route   DELETE /api/v1/admin/:id
// @access  Private/Superadmin
exports.deleteAdmin = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.params.id);

  if (!admin) {
    return next(new AppError(`Admin not found with id of ${req.params.id}`, 404));
  }

  // Prevent deleting superadmin if last superadmin
  if (admin.adminType === 'superadmin') {
    const superadminCount = await Admin.countDocuments({ adminType: 'superadmin' });
    if (superadminCount <= 1) {
      return next(new AppError('Cannot delete the last superadmin', 400));
    }
  }

  // Delete both admin profile and user account
  await User.findByIdAndDelete(admin.user);
  await admin.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});