const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../../models/userModel');
const adminModel = require('../../models/adminmodel');
// const { sendEmail } = require('../services/emailService');

/**
 * @desc    Register a new admin (with user creation)
 * @route   POST /api/admins/register
 * @access  Private/Superadmin
 */
exports.registerAdmin = async (req, res) => {
  try {
    const { 
      email, 
      password,
      name, 
      phoneNumber,
      adminType 
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !adminType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin already exists' 
      });
    }

    // Create user
    const user = await userModel.create({
      email,
      password,
      role: 'admin'
    });

    // Create admin profile
    const admin = await adminModel.create({
      user: user._id,
      name,
      phoneNumber,
      adminType,
      permissions: [] // Initialize with empty permissions
    });

    res.status(201).json({ 
      success: true, 
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        admin: {
          id: admin._id,
          name: admin.name,
          adminType: admin.adminType
        }
      },
      message: 'Admin registered successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Admin login
 * @route   POST /api/admins/login
 * @access  Public
 */
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await userModel.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin account required'
      });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin profile exists
    const admin = await adminModel.findOne({ user: user._id });
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        adminType: admin.adminType 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Update last login time
    user.lastLoginAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      token,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        admin: {
          id: admin._id,
          name: admin.name,
          adminType: admin.adminType
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

/**
 * @desc    Get admin by email
 * @route   GET /api/admins/email/:email
 * @access  Private/Admin
 */
exports.getAdminByEmail = async (req, res) => {
  try {
    const email = req.params.email;

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find admin profile
    const admin = await adminModel.findOne({ user: user._id })
      .populate('user', 'email role createdAt');

    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin profile not found for this user' 
      });
    }

    // Authorization check (superadmin can access all, others only their own)
    if (req.admin.adminType !== 'superadmin' && admin.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this admin profile'
      });
    }

    res.status(200).json({ 
      success: true, 
      data: admin 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get all admins
 * @route   GET /api/admins
 * @access  Private/Superadmin
 */
exports.getAllAdmins = async (req, res) => {
  try {
    // Authorization check
    if (req.admin.adminType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    const admins = await adminModel.find()
      .populate('user', 'email role createdAt');

    res.status(200).json({ 
      success: true, 
      count: admins.length,
      data: admins 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Update admin by email
 * @route   PUT /api/admins/email/:email
 * @access  Private/Admin
 */
exports.updateAdminByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const updateData = req.body;

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find admin profile
    const admin = await adminModel.findOne({ user: user._id });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin profile not found for this user' 
      });
    }

    // Authorization check (superadmin can update all, others only their own)
    if (req.admin.adminType !== 'superadmin' && admin.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this admin profile'
      });
    }

    // Prevent certain updates if not superadmin
    if (req.admin.adminType !== 'superadmin') {
      delete updateData.adminType;
      delete updateData.permissions;
    }

    // Update admin profile
    const updatedAdmin = await adminModel.findOneAndUpdate(
      { user: user._id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      success: true, 
      data: updatedAdmin,
      message: 'Admin profile updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Delete admin by email
 * @route   DELETE /api/admins/email/:email
 * @access  Private/Superadmin
 */
exports.deleteAdminByEmail = async (req, res) => {
  try {
    const email = req.params.email;

    // Authorization check
    if (req.admin.adminType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Find admin profile
    const admin = await adminModel.findOne({ user: user._id });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin profile not found for this user' 
      });
    }

    // Prevent deleting superadmin accounts (add additional checks as needed)
    if (admin.adminType === 'superadmin') {
      const superadminCount = await adminModel.countDocuments({ adminType: 'superadmin' });
      if (superadminCount <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete the last superadmin' 
        });
      }
    }

    // Delete admin profile
    await adminModel.findOneAndDelete({ user: user._id });

    // Delete user account
    await userModel.findByIdAndDelete(user._id);

    res.status(200).json({ 
      success: true, 
      data: {},
      message: 'Admin account deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Get current admin profile
 * @route   GET /api/admins/me
 * @access  Private/Admin
 */
exports.getMyAdminProfile = async (req, res) => {
  try {
    const admin = await adminModel.findOne({ user: req.user._id })
      .populate('user', 'email role createdAt');

    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin profile not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: admin 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};

/**
 * @desc    Update current admin profile
 * @route   PUT /api/admins/me
 * @access  Private/Admin
 */
exports.updateMyAdminProfile = async (req, res) => {
  try {
    // Remove restricted fields
    delete req.body.adminType;
    delete req.body.permissions;

    const admin = await adminModel.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin profile not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: admin,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: err.message 
    });
  }
};