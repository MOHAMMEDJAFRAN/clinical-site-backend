const Merchant = require('../../models/clinical.model');
const User = require('../../models/userModel');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Get merchant profile - modify the response
exports.getProfile = async (req, res) => {
  try {
    const clinicId = req.params.clinicId || req.query.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({ 
        success: false,
        message: 'Clinic ID is required' 
      });
    }

    const merchant = await Merchant.findById(clinicId)
      .populate('user', 'email role');
    
    if (!merchant) {
      return res.status(404).json({ 
        success: false,
        message: 'Clinic profile not found' 
      });
    }
    // Standardized response format
    res.status(200).json({
      success: true,
      data: {
        id: merchant._id,
        clinicName: merchant.clinicname,
        address: merchant.address,
        city: merchant.city,
        phoneNumber: merchant.phoneNumber,
        inchargeName: merchant.in_chargename,
        email: merchant.user.email,
        status: merchant.status,
        isApproved: merchant.isApproved,
        createdAt: merchant.createdAt,
        updatedAt: merchant.updatedAt
      },
      user: {
        id: merchant.user._id,
        email: merchant.user.email,
        role: merchant.user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server Error' 
    });
  }
};

// Update merchant profile by clinic ID
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const clinicId = req.params.clinicId || req.query.clinicId;
  const { clinicName, address, city, phoneNumber, inchargeName, status } = req.body;

  try {
    // First get the clinic to verify ownership
    const existingClinic = await Merchant.findById(clinicId).populate('user');
    
    if (!existingClinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }


    const updateData = {
      clinicname: clinicName,
      address,
      city,
      phoneNumber,
      in_chargename: inchargeName
    };

    // Only allow status update for admins
    // if (req.user.role === 'admin' && status) {
    //   updateData.status = status;
    //   updateData.isApproved = status === 'Active';
    // }

    const merchant = await Merchant.findByIdAndUpdate(
      clinicId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: {
        id: merchant._id,
        clinicName: merchant.clinicname,
        address: merchant.address,
        city: merchant.city,
        phoneNumber: merchant.phoneNumber,
        inchargeName: merchant.in_chargename,
        status: merchant.status,
        isApproved: merchant.isApproved
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update email (still user-based)
// Update email
exports.updateEmail = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { email, clinicId } = req.body; // Make sure to get clinicId from body
  
    try {
      if (!clinicId) {
        return res.status(400).json({ 
          success: false,
          message: 'Clinic ID is required' 
        });
      }
  
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      const clinic = await Merchant.findById(clinicId).populate('user');
      
      if (!clinic) {
        return res.status(404).json({ 
          success: false,
          message: 'Clinic not found' 
        });
      }
  
      if (existingUser && existingUser._id.toString() !== clinic.user._id.toString()) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already in use' 
        });
      }
  
      // Update user email
      const user = await User.findByIdAndUpdate(
        clinic.user._id,
        { email },
        { new: true }
      );
  
      res.status(200).json({
        success: true,
        message: 'Email updated successfully',
        data: {
          email: user.email
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false,
        message: 'Server Error' 
      });
    }
  };
  
  // Update password
  exports.updatePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { currentPassword, newPassword, clinicId } = req.body;
  
    try {
      if (!clinicId) {
        return res.status(400).json({ 
          success: false,
          message: 'Clinic ID is required' 
        });
      }
  
      const clinic = await Merchant.findById(clinicId).populate('user');
      if (!clinic) {
        return res.status(404).json({ 
          success: false,
          message: 'Clinic not found' 
        });
      }
  
      const user = await User.findById(clinic.user._id).select('+password');
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ 
          success: false,
          message: 'Current password is incorrect' 
        });
      }
  
      // Update password
      user.password = newPassword;
      await user.save();
  
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        success: false,
        message: 'Server Error' 
      });
    }
  };