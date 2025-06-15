const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/userModel');
const Merchant = require('../../models/clinical.model');
const Admin = require('../../models/adminmodel');
const Staff = require('../../models/staff.model');

// @desc    Unified login for all roles
// @route   POST /api/v1/auth/login
// @access  Public
exports.unifiedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
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

    // Prepare common response data
    const responseData = {
      success: true,
      token: '',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar
      },
      profile: null
    };

    // Handle different roles
    switch (user.role) {
      case 'merchant':
        await handleMerchantLogin(user, responseData, res);
        break;

      case 'admin':
        await handleAdminLogin(user, responseData, res);
        break;

      case 'staff':
        await handleStaffLogin(user, responseData, res);
        break;

      default:
        return res.status(403).json({
          success: false,
          message: 'Unauthorized role'
        });
    }

    // If we haven't returned yet, proceed with successful login
    if (responseData.token) {
      // Update last login time
      user.lastLoginAt = Date.now();
      await user.save();

      return res.status(200).json(responseData);
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};

// Helper function for merchant login
async function handleMerchantLogin(user, responseData, res) {
  const merchant = await Merchant.findOne({ user: user._id });
  
  if (!merchant) {
    res.status(403).json({
      success: false,
      message: 'Merchant profile not found'
    });
    return false;
  }

  // Check merchant account status
  if (!merchant.isApproved) {
    res.status(403).json({
      success: false,
      message: 'Merchant account not yet approved'
    });
    return false;
  }

  if (merchant.status === 'onhold') {
    res.status(403).json({
      success: false,
      message: 'Merchant account is on hold'
    });
    return false;
  }

  if (merchant.status === 'deactive') {
    res.status(403).json({
      success: false,
      message: 'Merchant account is deactivated'
    });
    return false;
  }

  // Generate token for merchant
  responseData.token = generateToken(user, { merchantId: merchant._id });

  // Add merchant profile data
  responseData.profile = {
    id: merchant._id,
    clinicName: merchant.clinicname,
    isApproved: merchant.isApproved,
    status: merchant.status,
    address: merchant.address,
    ...(merchant.specialization && { specialization: merchant.specialization }),
    ...(merchant.bio && { bio: merchant.bio })
  };

  return true;
}

// Helper function for admin login
async function handleAdminLogin(user, responseData, res) {
  const admin = await Admin.findOne({ user: user._id });
  
  if (!admin) {
    res.status(403).json({
      success: false,
      message: 'Admin profile not found'
    });
    return false;
  }

  // Generate token for admin
  responseData.token = generateToken(user, { 
    adminType: admin.adminType,
    adminId: admin._id
  });

  // Add admin profile data
  responseData.profile = {
    id: admin._id,
    name: admin.name,
    adminType: admin.adminType,
    ...(admin.department && { department: admin.department })
  };

  return true;
}

// Helper function for staff login
async function handleStaffLogin(user, responseData, res) {
  const staff = await Staff.findOne({ user: user._id }).populate('clinic');
  
  if (!staff) {
    res.status(403).json({
      success: false,
      message: 'Staff profile not found'
    });
    return false;
  }

  // Check staff account status
  if (!staff.isActive) {
    res.status(403).json({
      success: false,
      message: 'Staff account is inactive'
    });
    return false;
  }

  if (staff.status === 'Inactive') {
    res.status(403).json({
      success: false,
      message: 'Staff account is inactive'
    });
    return false;
  }

  // Generate token for staff
  responseData.token = generateToken(user, { 
    staffId: staff._id,
    clinicId: staff.clinic._id
  });

  // Add staff profile data
  responseData.profile = {
    id: staff._id,
    name: staff.name,
    clinicId: staff.clinic._id,
    clinicName: staff.clinic.clinicname,
    phone: staff.phone,
    address: staff.address,
    city: staff.city,
    gender: staff.gender,
    status: staff.status,
    isActive: staff.isActive
  };

  return true;
}

// Helper function to generate JWT token
function generateToken(user, additionalData = {}) {
  const payload = {
    id: user._id,
    role: user.role,
    ...additionalData
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
}