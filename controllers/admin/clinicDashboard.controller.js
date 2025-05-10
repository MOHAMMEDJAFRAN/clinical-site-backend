const Appointment = require('../../models/appointment.model');
const Merchant = require('../../models/clinical.model');
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');

// Get dashboard data for clinical center
exports.getDashboardData = async (req, res) => {
  try {
    // Get clinic ID from query parameter or header
    const clinicId = req.query.clinicId || req.headers['x-clinic-id'];
    
    if (!clinicId) {
      return res.status(400).json({ message: 'Clinic ID is required' });
    }

    // Get merchant (clinic) information
    const merchant = await Merchant.findOne({ _id: clinicId })
      .populate('user', 'name email');

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's appointments
    const todayAppointments = await Appointment.find({
      merchant: merchant._id,
      appointmentDate: todayStr,
      status: { $in: ['Confirm', 'Pending', 'Completed', 'Cancelled'] }
    })
    .populate('doctor', 'name')
    .populate('shiftTime', 'timeRange')
    .sort({ appointmentTime: 1 });

    // Get upcoming appointments (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const upcomingAppointments = await Appointment.find({
      merchant: merchant._id,
      appointmentDate: { $gt: todayStr, $lte: nextWeekStr },
      status: { $in: ['Confirm'] }
    })
    .populate('doctor', 'name')
    .populate('shiftTime', 'timeRange')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

    // Count completed appointments today
    const completedCount = await Appointment.countDocuments({
      merchant: merchant._id,
      appointmentDate: todayStr,
      status: 'Completed'
    });

    // Count cancelled appointments today
    const cancelledCount = await Appointment.countDocuments({
      merchant: merchant._id,
      appointmentDate: todayStr,
      status: 'Cancelled'
    });

    // Count active doctors
    const activeDoctorsCount = await Doctor.countDocuments({
      merchant: merchant._id,
      status: 'Active'
    });

    // Format the response data to match frontend expectations
    const formattedTodayAppointments = todayAppointments.map(app => ({
      _id: app._id,
      patientName: app.patientName,
      doctor: { name: app.doctor?.name || 'N/A' },
      appointmentDate: app.appointmentDate,
      appointmentTime: app.appointmentTime,
      status: app.status,
      patientGender: app.patientGender,
      patientContact: app.patientContact,
      queueNumber: app.queueNumber,
      patientAge: app.patientAge,
      shiftTime: app.shiftTime?.timeRange || 'N/A'
    }));

    const formattedUpcomingAppointments = upcomingAppointments.map(app => ({
      _id: app._id,
      patientName: app.patientName,
      doctor: { name: app.doctor?.name || 'N/A' },
      appointmentDate: app.appointmentDate,
      appointmentTime: app.appointmentTime,
      status: app.status,
      patientGender: app.patientGender,
      patientContact: app.patientContact,
      queueNumber: app.queueNumber,
      patientAge: app.patientAge,
      shiftTime: app.shiftTime?.timeRange || 'N/A'
    }));

    res.json({
      clinic: {
        id: merchant._id,
        clinicName: merchant.clinicname,
        address: merchant.address,
        city: merchant.city,
        phoneNumber: merchant.phoneNumber,
        isApproved: merchant.status === 'Approved'
      },
      todayAppointments: formattedTodayAppointments,
      upcomingAppointments: formattedUpcomingAppointments,
      doctorsCount: activeDoctorsCount,
      completedCount,
      cancelledCount
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!['Confirm', 'Completed', 'Cancelled', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    )
    .populate('doctor', 'name')
    .populate('merchant', 'clinicname')
    .populate('shiftTime', 'timeRange');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Format the response to match frontend expectations
    const formattedAppointment = {
      _id: appointment._id,
      patientName: appointment.patientName,
      doctor: { name: appointment.doctor?.name || 'N/A' },
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
      patientGender: appointment.patientGender,
      patientContact: appointment.patientContact,
      queueNumber: appointment.queueNumber,
      patientAge: appointment.patientAge,
      shiftTime: appointment.shiftTime?.timeRange || 'N/A',
      merchant: {
        clinicname: appointment.merchant?.clinicname || 'N/A'
      }
    };

    res.json({
      message: 'Appointment status updated successfully',
      appointment: formattedAppointment
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get appointment details
exports.getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name')
      .populate('merchant', 'clinicname address phoneNumber')
      .populate('shiftTime', 'timeRange');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      appointment: {
        _id: appointment._id,
        patientName: appointment.patientName,
        doctor: { name: appointment.doctor?.name || 'N/A' },
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status,
        patientGender: appointment.patientGender,
        patientContact: appointment.patientContact,
        queueNumber: appointment.queueNumber,
        patientAge: appointment.patientAge,
        clinicName: appointment.merchant?.clinicname || 'N/A',
        clinicAddress: appointment.merchant?.address || 'N/A',
        clinicPhone: appointment.merchant?.phoneNumber || 'N/A',
        bookingDate: appointment.bookingDate,
        referenceNumber: appointment.referenceNumber,
        shiftTime: appointment.shiftTime?.timeRange || 'N/A'
      }
    });

  } catch (error) {
    console.error('Error fetching appointment details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};