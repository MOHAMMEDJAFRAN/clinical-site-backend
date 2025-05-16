const Appointment = require('../../models/appointment.model');
const Merchant = require('../../models/clinical.model');
const Doctor = require('../../models/doctor.model');

// Get all clinics for the admin view
exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Merchant.find({})
      .select('clinicname city address in_chargename phoneNumber status')
      .lean();

    res.status(200).json({
      success: true,
      data: clinics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get appointments for a specific clinic
exports.getClinicAppointments = async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Validate clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Get appointments with doctor details
    const appointments = await Appointment.find({ merchant: clinicId })
      .populate('doctor', 'name specialization')
      .populate('shiftTime', 'shiftName startTime endTime')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        clinic,
        appointments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Filter appointments with various criteria
exports.filterAppointments = async (req, res) => {
  try {
    const { clinicId } = req.params;
    let { status, startDate, endDate } = req.query;

    // Build filter object
    const filter = { merchant: clinicId };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = startDate;
      if (endDate) filter.appointmentDate.$lte = endDate;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization')
      .populate('shiftTime', 'shiftName startTime endTime')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    // Get counts for stats
    const total = await Appointment.countDocuments({ merchant: clinicId });
    const confirmed = await Appointment.countDocuments({ 
      merchant: clinicId, 
      status: 'Confirm' 
    });
    const completed = await Appointment.countDocuments({ 
      merchant: clinicId, 
      status: 'Completed' 
    });
    const cancelled = await Appointment.countDocuments({ 
      merchant: clinicId, 
      status: 'Cancelled' 
    });

    res.status(200).json({
      success: true,
      data: {
        appointments,
        stats: {
          total,
          confirmed,
          completed,
          cancelled
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!['Confirm', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};