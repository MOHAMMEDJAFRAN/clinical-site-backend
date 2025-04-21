// controllers/merchantController.js

const bcrypt = require('bcryptjs');
// const { sendEmail } = require('../../services/emailService');
const userModel = require('../../models/userModel');
const merchntodel = require('../../models/clinical.model');
const jwt = require("jsonwebtoken")
/**
 * @desc    Register a new merchant (with user creation)
 * @route   POST /api/merchants/register
 * @access  Public
 */
exports.
registerMerchant = async (req, res) => {
  try {
    const { 
      email, 
      password,
      clinicname, 
      city, 
      address, 
      in_chargename, 
      phoneNumber 
    } = req.body;

    // Validate required fields
    if (!email || !password || !clinicname || !city || !address || !in_chargename || !phoneNumber) {
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
        message: 'User already exists' 
      });
    }

    // Hash password
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await userModel.create({
      email,
      password,
      role: 'merchant' // Set role directly to merchant
    });

    // Create merchant profile
    const merchant = await merchntodel.create({
      user: user._id,
      clinicname,
      city,
      address,
      in_chargename,
      phoneNumber,
      isApproved: false // Default to false, admin must approve
    });

    // Send verification email (optional)
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Merchant Registration Received',
    //   text: `Your merchant account for ${clinicname} has been received and is pending approval.`
    // });

    res.status(201).json({ 
      success: true, 
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        merchant: {
          id: merchant._id,
          clinicname: merchant.clinicname,
          isApproved: merchant.isApproved
        }
      },
      message: 'Merchant registration submitted for approval'
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


exports.loginMerchant = async (req, res) => {
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

    // Verify user is a merchant
    if (user.role !== 'merchant') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Merchant account required'
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

    // Check if merchant profile exists and is approved
    const merchant = await merchntodel.findOne({ user: user._id });
    if (!merchant) {
      return res.status(403).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // if (!merchant.isApproved) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Merchant account not yet approved'
    //   });
    // }

    // Create token (using JWT example)
    const token = jwt.sign(
      { id: user._id, role: user.role },
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
        merchant: {
          id: merchant._id,
          clinicname: merchant.clinicname,
          isApproved: merchant.isApproved
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
 * @desc    Get merchant by email
 * @route   GET /api/merchants/email/:email
 * @access  Public (or Private based on your needs)
 */
exports.getMerchantByEmail = async (req, res) => {
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

    // Find merchant profile
    const merchant = await merchntodel.findOne({ user: user._id })
      .populate('user', 'email role isVerified createdAt');

    if (!merchant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Merchant profile not found for this user' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: merchant 
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
 * @desc    Update merchant by email
 * @route   PUT /api/merchants/email/:email
 * @access  Public (or Private based on your needs)
 */
exports.updateMerchantByEmail = async (req, res) => {
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

    // Find and update merchant profile
    const merchant = await merchntodel.findOneAndUpdate(
      { user: user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!merchant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Merchant profile not found for this user' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: merchant,
      message: 'Merchant profile updated successfully'
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
 * @desc    Approve merchant by email
 * @route   PUT /api/merchants/email/:email/approve
 * @access  Public (should be protected in production)
 */
exports.approveMerchantByEmail = async (req, res) => {
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

    // Find and update merchant approval status
    const merchant = await merchntodel.findOneAndUpdate(
      { user: user._id },
      { isApproved: true },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Merchant profile not found for this user' 
      });
    }

    // Send approval notification
    await sendEmail({
      to: user.email,
      subject: 'Merchant Account Approved',
      text: `Your merchant account for ${merchant.clinicname} has been approved.`
    });

    res.status(200).json({ 
      success: true, 
      data: merchant,
      message: 'Merchant approved successfully'
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
 * @desc    Delete merchant by email
 * @route   DELETE /api/merchants/email/:email
 * @access  Public (should be protected in production)
 */
exports.deleteMerchantByEmail = async (req, res) => {
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

    // Delete merchant profile
    await merchntodel.findOneAndDelete({ user: user._id });

    // Delete user account
    await userModel.findByIdAndDelete(user._id);

    res.status(200).json({ 
      success: true, 
      data: {},
      message: 'Merchant account deleted successfully'
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