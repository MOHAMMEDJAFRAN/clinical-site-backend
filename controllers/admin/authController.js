const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/userModel');
const Merchant = require('../../models/clinical.model');
const Admin = require('../../models/adminmodel');

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
        message: 'Please provide email and password'
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

    // Initialize common response data
    const responseData = {
      success: true,
      token: '',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      profile: null
    };

    // Handle different roles
    switch (user.role) {
      case 'merchant':
        const merchant = await Merchant.findOne({ user: user._id });
        if (!merchant) {
          return res.status(403).json({
            success: false,
            message: 'Merchant profile not found'
          });
        }
        
        if (!merchant.isApproved) {
          return res.status(403).json({
            success: false,
            message: 'Merchant account not yet approved'
          });
        }

        responseData.token = jwt.sign(
          { 
            id: user._id, 
            role: user.role,
            merchantId: merchant._id 
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );
        
        responseData.profile = {
          id: merchant._id,
          clinicname: merchant.clinicname,
          isApproved: merchant.isApproved
        };
        break;

      case 'admin':
        const admin = await Admin.findOne({ user: user._id });
        if (!admin) {
          return res.status(403).json({
            success: false,
            message: 'Admin profile not found'
          });
        }

        responseData.token = jwt.sign(
          { 
            id: user._id, 
            role: user.role,
            adminType: admin.adminType,
            adminId: admin._id 
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );
        
        responseData.profile = {
          id: admin._id,
          name: admin.name,
          adminType: admin.adminType
        };
        break;

      default:
        return res.status(403).json({
          success: false,
          message: 'Unauthorized role'
        });
    }

    // Update last login time
    user.lastLoginAt = Date.now();
    await user.save();

    res.status(200).json(responseData);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: err.message
    });
  }
};