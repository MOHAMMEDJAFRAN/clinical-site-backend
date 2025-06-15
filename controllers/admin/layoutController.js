const Appointment = require('../../models/appointment.model');
const Merchant = require('../../models/clinical.model');
const { validationResult } = require('express-validator');

// Get clinic notifications (recent appointments)
// Get clinic notifications (recent appointments)
exports.getClinicNotifications = async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    
    // Verify clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Get recent appointments (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const appointments = await Appointment.find({
      merchant: clinicId,
      createdAt: { $gte: sevenDaysAgo },
      status: { $in: ['Confirm', 'Pending'] }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('doctor', 'name')
    .lean();

    // Format notifications
    const notifications = appointments.map(appt => ({
      id: appt._id,
      title: `New appointment with Dr. ${appt.doctor.name}`,
      message: `Patient: ${appt.patientName} (${appt.patientAge}yrs) - ${appt.appointmentDate} at ${appt.appointmentTime}`,
      time: appt.createdAt,
      isRead: appt.isRead || false, // Use the actual read status from DB
      type: 'appointment'
    }));

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};


// Mark notifications as read
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const clinicId = req.body.clinicId;
    
    // Verify clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Update all unread notifications for this clinic
    await Appointment.updateMany(
      { 
        merchant: clinicId,
        isRead: false 
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get clinic profile
exports.getClinicProfile = async (req, res) => {
  try {
    const clinicId = req.params.clinicId;
    
    const clinic = await Merchant.findById(clinicId)
      .populate('user', 'email role')
      .lean();

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: clinic._id,
        clinicName: clinic.clinicname,
        address: clinic.address,
        city: clinic.city,
        phoneNumber: clinic.phoneNumber,
        inchargeName: clinic.in_chargename,
        email: clinic.user?.email,
        status: clinic.status,
        isApproved: clinic.isApproved,
        createdAt: clinic.createdAt,
        updatedAt: clinic.updatedAt
      },
      user: {
        id: clinic.user?._id,
        email: clinic.user?.email,
        role: clinic.user?.role
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

// Clear all notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const clinicId = req.body.clinicId;
    
    // Verify clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Delete all notifications for this clinic
    await Appointment.deleteMany({ merchant: clinicId });

    res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};