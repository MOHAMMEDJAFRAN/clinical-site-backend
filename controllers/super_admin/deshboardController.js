// controllers/adminDashboardController.js

const Appointment = require('../../models/appointment.model');
const Merchant = require('../../models/clinical.model');
const Complaint = require('../../models/complientModel');
const Contact = require('../../models/contactusModel');

// Get dashboard summary statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Count all appointments
    const totalAppointments = await Appointment.countDocuments();
    
    // Count pending queries (from both Complaint and Contact models)
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const pendingContacts = await Contact.countDocuments({ status: 'Pending' });
    const totalPendingQueries = pendingComplaints + pendingContacts;

    // Get recent appointments (last 5)
    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('merchant', 'clinicname')
      .populate('doctor', 'name');

    // Format the data for the frontend
    const stats = {
      appointments: {
        total: totalAppointments,
        recent: recentAppointments.map(appt => ({
          patient: appt.patientName,
          doctor: appt.doctor?.name || 'Unknown',
          center: appt.merchant?.clinicname || 'Unknown',
          date: appt.appointmentDate,
          status: appt.status
        }))
      },
      queries: {
        pending: totalPendingQueries
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get all clinical centers (merchants)
exports.getClinicalCenters = async (req, res) => {
  try {
    const centers = await Merchant.find()
      .select('clinicname city address status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: centers
    });
  } catch (error) {
    console.error('Error fetching clinical centers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinical centers',
      error: error.message
    });
  }
};

// Get all pending queries (both complaints and contact forms)
exports.getPendingQueries = async (req, res) => {
  try {
    const complaints = await Complaint.find({ status: 'Pending' })
      .select('clinicName senderName subject submittedOn')
      .sort({ submittedOn: -1 });

    const contacts = await Contact.find({ status: 'Pending' })
      .select('name email subject createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        complaints,
        contacts
      }
    });
  } catch (error) {
    console.error('Error fetching pending queries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending queries',
      error: error.message
    });
  }
};