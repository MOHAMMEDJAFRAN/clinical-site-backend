// controllers/appointmentReportController.js
const Appointment = require('../../models/appointment.model');
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');
const Merchant = require('../../models/clinical.model');

// Get appointments report for a specific merchant/clinic
const getAppointmentsReport = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { startDate, endDate, status, doctorId } = req.query;

    // Validate clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Build query filter
    let filter = { merchant: clinicId };

    // Date range filter
    if (startDate && endDate) {
      filter.appointmentDate = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      filter.appointmentDate = { $gte: startDate };
    } else if (endDate) {
      filter.appointmentDate = { $lte: endDate };
    }

    // Status filter
    if (status && status !== '') {
      filter.status = status;
    }

    // Doctor filter
    if (doctorId && doctorId !== '') {
      filter.doctor = doctorId;
    }

    // Fetch appointments with populated data
    const appointments = await Appointment.find(filter)
      .populate({
        path: 'doctor',
        select: 'name'
      })
      .populate({
        path: 'shiftTime',
        select: 'timeRange shiftName'
      })
      .sort({ appointmentDate: -1, createdAt: -1 });

    // Get all doctors for this clinic for the filter dropdown
    const doctors = await Doctor.find({ merchant: clinicId })
      .select('_id name')
      .sort({ name: 1 });

    // Calculate metrics
    const allAppointments = await Appointment.find({ merchant: clinicId });
    const totalAppointments = allAppointments.length;
    const confirmAppointments = allAppointments.filter(app => app.status === 'Confirm').length;
    const completeAppointments = allAppointments.filter(app => app.status === 'Completed').length;
    const cancelAppointments = allAppointments.filter(app => app.status === 'Cancelled').length;

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      doctorName: appointment.doctor ? appointment.doctor.name : 'Unknown Doctor',
      patientName: appointment.patientName,
      patientContact: appointment.patientContact,
      patientGender: appointment.patientGender,
      appointmentDate: appointment.appointmentDate,
      shiftTime: appointment.shiftTime ? appointment.shiftTime.timeRange : 'Not specified',
      status: appointment.status,
      queueNumber: appointment.queueNumber,
      referenceNumber: appointment.referenceNumber,
      appointmentTime: appointment.appointmentTime,
      bookingDate: appointment.bookingDate
    }));

    res.status(200).json({
      success: true,
      data: {
        appointments: formattedAppointments,
        doctors: doctors,
        metrics: {
          totalAppointments,
          confirmAppointments,
          completeAppointments,
          cancelAppointments
        },
        clinic: {
          id: clinic._id,
          name: clinic.clinicname,
          city: clinic.city,
          status: clinic.status
        }
      }
    });

  } catch (error) {
    console.error('Error fetching appointments report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments report',
      error: error.message
    });
  }
};

// Get filtered appointments report (for real-time filtering)
const getFilteredAppointmentsReport = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { startDate, endDate, status, doctorId } = req.query;

    // Validate clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Build query filter
    let filter = { merchant: clinicId };

    // Date range filter
    if (startDate && endDate) {
      filter.appointmentDate = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      filter.appointmentDate = { $gte: startDate };
    } else if (endDate) {
      filter.appointmentDate = { $lte: endDate };
    }

    // Status filter
    if (status && status !== '') {
      filter.status = status;
    }

    // Doctor filter
    if (doctorId && doctorId !== '') {
      filter.doctor = doctorId;
    }

    // Fetch filtered appointments
    const appointments = await Appointment.find(filter)
      .populate({
        path: 'doctor',
        select: 'name'
      })
      .populate({
        path: 'shiftTime',
        select: 'timeRange shiftName'
      })
      .sort({ appointmentDate: -1, createdAt: -1 });

    // Calculate metrics for filtered data
    const totalAppointments = appointments.length;
    const confirmAppointments = appointments.filter(app => app.status === 'Confirm').length;
    const completeAppointments = appointments.filter(app => app.status === 'Completed').length;
    const cancelAppointments = appointments.filter(app => app.status === 'Cancelled').length;

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      doctorName: appointment.doctor ? appointment.doctor.name : 'Unknown Doctor',
      patientName: appointment.patientName,
      patientContact: appointment.patientContact,
      patientGender: appointment.patientGender,
      appointmentDate: appointment.appointmentDate,
      shiftTime: appointment.shiftTime ? appointment.shiftTime.timeRange : 'Not specified',
      status: appointment.status,
      queueNumber: appointment.queueNumber,
      referenceNumber: appointment.referenceNumber,
      appointmentTime: appointment.appointmentTime
    }));

    res.status(200).json({
      success: true,
      data: {
        appointments: formattedAppointments,
        metrics: {
          totalAppointments,
          confirmAppointments,
          completeAppointments,
          cancelAppointments
        }
      }
    });

  } catch (error) {
    console.error('Error fetching filtered appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filtered appointments',
      error: error.message
    });
  }
};

// Get appointment statistics for dashboard
const getAppointmentStats = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { period } = req.query; // 'today', 'week', 'month', 'year'

    // Validate clinic exists
    const clinic = await Merchant.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const today = now.toISOString().split('T')[0];
        dateFilter.appointmentDate = today;
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateFilter.appointmentDate = {
          $gte: weekStart.toISOString().split('T')[0],
          $lte: weekEnd.toISOString().split('T')[0]
        };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter.appointmentDate = {
          $gte: monthStart.toISOString().split('T')[0],
          $lte: monthEnd.toISOString().split('T')[0]
        };
        break;
      default:
        // All time - no date filter
        break;
    }

    const filter = { merchant: clinicId, ...dateFilter };

    // Get appointment statistics
    const appointments = await Appointment.find(filter);
    
    const stats = {
      totalAppointments: appointments.length,
      confirmAppointments: appointments.filter(app => app.status === 'Confirm').length,
      completeAppointments: appointments.filter(app => app.status === 'Completed').length,
      cancelAppointments: appointments.filter(app => app.status === 'Cancelled').length,
      period: period || 'all-time'
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAppointmentsReport,
  getFilteredAppointmentsReport,
  getAppointmentStats
};