// controllers/staffController.js
const bcrypt = require('bcryptjs');
const User = require('../../models/userModel');
const Merchant = require('../../models/clinical.model');
const Staff = require('../../models/staff.model');

/**
 * @desc    Create a new staff member
 * @route   POST /api/staff/:clinicId
 * @access  Public (no token required as requested)
 */
exports.createStaff = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { 
      name, 
      phone, 
      address, 
      city, 
      gender, 
      email, 
      password 
    } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !city || !gender || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Check if clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Create user account
    const user = await User.create({
      email,
      password,
      role: 'staff'
    });

    // Create staff profile
    const staff = await Staff.create({
      user: user._id,
      clinic: clinicId,
      name,
      phone,
      address,
      city,
      gender
    });

    // Populate the response
    const populatedStaff = await Staff.findById(staff._id)
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname');

    res.status(201).json({ 
      success: true, 
      data: populatedStaff,
      message: 'Staff member created successfully'
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
 * @desc    Get all staff members for a clinic
 * @route   GET /api/staff/:clinicId
 * @access  Public
 */
exports.getStaffByClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Check if clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    // Get all staff for the clinic
    const staff = await Staff.find({ clinic: clinicId, isActive: true })
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: staff,
      count: staff.length
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
 * @desc    Get a single staff member
 * @route   GET /api/staff/:clinicId/:staffId
 * @access  Public
 */
exports.getStaffById = async (req, res) => {
  try {
    const { clinicId, staffId } = req.params;

    // Find staff member
    const staff = await Staff.findOne({ 
      _id: staffId, 
      clinic: clinicId, 
      isActive: true 
    })
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname');

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: staff
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
 * @desc    Update staff member
 * @route   PUT /api/staff/:clinicId/:staffId
 * @access  Public
 */
exports.updateStaff = async (req, res) => {
  try {
    const { clinicId, staffId } = req.params;
    const updateData = req.body;

    // Find staff member
    const staff = await Staff.findOne({ 
      _id: staffId, 
      clinic: clinicId, 
      isActive: true 
    });

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // If email is being updated, check if new email exists
    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email,
        _id: { $ne: staff.user }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }

      // Update user email
      await User.findByIdAndUpdate(staff.user, { email: updateData.email });
    }

    // If password is being updated
    if (updateData.password) {
      await User.findByIdAndUpdate(staff.user, { password: updateData.password });
    }

    // Remove email and password from staff update data
    const { email, password, ...staffUpdateData } = updateData;

    // Update staff profile
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      staffUpdateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname');

    res.status(200).json({ 
      success: true, 
      data: updatedStaff,
      message: 'Staff member updated successfully'
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
 * @desc    Delete staff member (soft delete)
 * @route   DELETE /api/staff/:clinicId/:staffId
 * @access  Public
 */
exports.deleteStaff = async (req, res) => {
  try {
    const { clinicId, staffId } = req.params;

    // Find staff member
    const staff = await Staff.findOne({ 
      _id: staffId, 
      clinic: clinicId, 
      isActive: true 
    });

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // Soft delete - set isActive to false
    await Staff.findByIdAndUpdate(staffId, { isActive: false });

    // Optionally, you can also deactivate the user account
    // await User.findByIdAndUpdate(staff.user, { isActive: false });

    res.status(200).json({ 
      success: true, 
      data: {},
      message: 'Staff member deleted successfully'
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
 * @desc    Search staff members
 * @route   GET /api/staff/:clinicId/search?q=searchTerm
 * @access  Public
 */
exports.searchStaff = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    // Check if clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Clinic not found' 
      });
    }

    // Search staff by name, phone, or email
    const staff = await Staff.find({ 
      clinic: clinicId,
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ]
    })
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname')
      .sort({ createdAt: -1 });

    // Also search by email in User model
    const users = await User.find({
      email: { $regex: q, $options: 'i' },
      role: 'staff'
    });

    const userIds = users.map(user => user._id);
    const staffByEmail = await Staff.find({
      clinic: clinicId,
      isActive: true,
      user: { $in: userIds }
    })
      .populate('user', 'email role createdAt')
      .populate('clinic', 'clinicname');

    // Combine and remove duplicates
    const allStaff = [...staff, ...staffByEmail];
    const uniqueStaff = allStaff.filter((item, index) => 
      allStaff.findIndex(staff => staff._id.toString() === item._id.toString()) === index
    );

    res.status(200).json({ 
      success: true, 
      data: uniqueStaff,
      count: uniqueStaff.length
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