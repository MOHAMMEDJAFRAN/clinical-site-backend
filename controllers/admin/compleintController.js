// controllers/complaintController.js
const Complaint = require('../../models/complientModel');
const mongoose = require('mongoose');

/**
 * Get all complaints for a specific merchant
 * @param {Object} req - Request object with merchantId in params
 * @param {Object} res - Response object
 */
exports.getComplaints = async (req, res) => {
  try {
    const merchantId = req.params.merchantId;
    
    // Validate merchant ID
    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid merchant ID format' 
      });
    }

    // Find all complaints for this merchant
    const complaints = await Complaint.find({ merchant: merchantId })
      .sort({ submittedOn: -1 }) // Sort by latest first
      .populate('assignedTo', 'name email') // Populate assigned user if needed
      .exec();
    
    return res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get complaints filtered by status for a specific merchant
 * @param {Object} req - Request object with merchantId and status in params
 * @param {Object} res - Response object
 */
exports.getComplaintsByStatus = async (req, res) => {
  try {
    const { merchantId, status } = req.params;
    
    // Validate merchant ID
    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid merchant ID format' 
      });
    }

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: Pending, In Progress, Resolved, Rejected'
      });
    }

    // Find complaints matching merchant and status
    const complaints = await Complaint.find({ 
      merchant: merchantId,
      status: status 
    })
    .sort({ submittedOn: -1 })
    .populate('assignedTo', 'name email')
    .exec();
    
    return res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error('Error fetching complaints by status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get a single complaint by ID
 * @param {Object} req - Request object with complaintId in params
 * @param {Object} res - Response object
 */
exports.getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    // Find the complaint
    const complaint = await Complaint.findById(complaintId)
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name email')
      .exec();
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Create a new complaint for a specific merchant
 * @param {Object} req - Request object with merchant ID and complaint data
 * @param {Object} res - Response object
 */
exports.createComplaint = async (req, res) => {
  try {
    const merchantId = req.params.merchantId;
    
    // Validate merchant ID
    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid merchant ID format' 
      });
    }

    // Extract complaint data from request body
    const {
      clinicName,
      senderName,
      contactInfo,
      subject,
      description,
      dateOfOccurrence
    } = req.body;

    // Validate required fields
    if (!clinicName || !senderName || !subject || !description || !dateOfOccurrence) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create new complaint
    const newComplaint = new Complaint({
      merchant: merchantId,
      clinicName,
      senderName,
      contactInfo,
      subject,
      description,
      dateOfOccurrence,
      status: 'Pending'
      // submittedOn and updatedAt will be set automatically by schema defaults
    });

    // Save the complaint
    const savedComplaint = await newComplaint.save();
    
    return res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      data: savedComplaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a complaint's status
 * @param {Object} req - Request object with complaintId in params and new status in body
 * @param {Object} res - Response object
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: Pending, In Progress, Resolved, Rejected'
      });
    }

    // Find and update the complaint
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { 
        status,
        updatedAt: Date.now()
      },
      { new: true } // Return the updated document
    );
    
    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Add a note to a complaint
 * @param {Object} req - Request object with complaintId in params and note data in body
 * @param {Object} res - Response object
 */
exports.addNoteToComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { content, userId } = req.body;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    // Validate required fields
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    // Validate user ID if provided
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }

    // Create the note object
    const note = {
      content,
      addedBy: userId || null
    };

    // Find and update the complaint with the new note
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { 
        $push: { notes: note },
        updatedAt: Date.now()
      },
      { new: true } // Return the updated document
    ).populate('notes.addedBy', 'name email');
    
    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Error adding note to complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Assign a complaint to a user
 * @param {Object} req - Request object with complaintId in params and userId in body
 * @param {Object} res - Response object
 */
exports.assignComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { userId } = req.body;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    // Validate user ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid user ID is required' 
      });
    }

    // Find and update the complaint with the assigned user
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { 
        assignedTo: userId,
        status: 'In Progress', // Optionally update status when assigned
        updatedAt: Date.now()
      },
      { new: true } // Return the updated document
    ).populate('assignedTo', 'name email');
    
    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Error assigning complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update a complaint
 * @param {Object} req - Request object with complaintId in params and updated data in body
 * @param {Object} res - Response object
 */
exports.updateComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    const updates = req.body;
    
    // Don't allow updating certain fields directly
    delete updates.submittedOn;
    delete updates.notes;
    delete updates.merchant;
    
    // Update the complaint
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { 
        ...updates,
        updatedAt: Date.now()
      },
      { 
        new: true,
        runValidators: true  // Run schema validators
      }
    );
    
    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: updatedComplaint
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map(val => val.message)
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Delete a complaint
 * @param {Object} req - Request object with complaintId in params
 * @param {Object} res - Response object
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    // Validate complaint ID
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid complaint ID format' 
      });
    }

    // Find and delete the complaint
    const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);
    
    if (!deletedComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get complaint statistics for a merchant
 * @param {Object} req - Request object with merchantId in params
 * @param {Object} res - Response object
 */
exports.getComplaintStats = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // Validate merchant ID
    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid merchant ID format' 
      });
    }

    // Get counts by status
    const stats = await Complaint.aggregate([
      { $match: { merchant: mongoose.Types.ObjectId(merchantId) } },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get total count
    const total = await Complaint.countDocuments({ merchant: merchantId });
    
    // Format the response
    const formattedStats = {
      total,
      byStatus: {}
    };
    
    // Initialize all statuses with 0 counts
    ['Pending', 'In Progress', 'Resolved', 'Rejected'].forEach(status => {
      formattedStats.byStatus[status] = 0;
    });
    
    // Update with actual counts
    stats.forEach(item => {
      formattedStats.byStatus[item.status] = item.count;
    });
    
    return res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error getting complaint statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};