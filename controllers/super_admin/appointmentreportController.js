const Appointment = require('../../models/appointment.model');
const Merchant = require('../../models/clinical.model');
const Doctor = require('../../models/doctor.model');

// Get appointment report with filters
exports.getAppointmentReport = async (req, res) => {
  try {
    const { startDate, endDate, status, clinicId } = req.query;
    
    // Build the query
    let query = {};
    
    // Date range filter
    if (startDate && endDate) {
      query.appointmentDate = { 
        $gte: new Date(startDate).toISOString().split('T')[0],
        $lte: new Date(endDate).toISOString().split('T')[0]
      };
    } else if (startDate) {
      query.appointmentDate = { 
        $gte: new Date(startDate).toISOString().split('T')[0]
      };
    } else if (endDate) {
      query.appointmentDate = { 
        $lte: new Date(endDate).toISOString().split('T')[0]
      };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Clinic filter
    if (clinicId) {
      query.merchant = clinicId;
    }
    
    // Get appointments with populated merchant and doctor details
    const appointments = await Appointment.find(query)
      .populate({
        path: 'merchant',
        select: 'clinicname'
      })
      .populate({
        path: 'doctor',
        select: 'name'
      })
      .sort({ appointmentDate: 1, appointmentTime: 1 });
    
    // Format the response to match frontend expectations
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      clinicId: appointment.merchant?._id,
      clinicName: appointment.merchant?.clinicname || 'Unknown Clinic',
      doctorName: appointment.doctor?.name || 'Unknown Doctor',
      patientName: appointment.patientName,
      patientContact: appointment.patientContact,
      patientGender: appointment.patientGender,
      appointmentDate: appointment.appointmentDate,
      time: appointment.appointmentTime,
      status: appointment.status
    }));
    
    // Get all clinics for filter dropdown
    const clinics = await Merchant.find({}, '_id clinicname');
    
    res.json({
      appointments: formattedAppointments,
      clinics: clinics.map(clinic => ({
        id: clinic._id,
        name: clinic.clinicname
      }))
    });
    
  } catch (error) {
    console.error('Error fetching appointment report:', error);
    res.status(500).json({ message: 'Server error while fetching appointment report' });
  }
};

// Get appointment statistics
exports.getAppointmentStats = async (req, res) => {
  try {
    const { startDate, endDate, clinicId } = req.query;
    
    let matchQuery = {};
    
    // Date range filter
    if (startDate && endDate) {
      matchQuery.appointmentDate = { 
        $gte: new Date(startDate).toISOString().split('T')[0],
        $lte: new Date(endDate).toISOString().split('T')[0]
      };
    }
    
    // Clinic filter
    if (clinicId) {
      matchQuery.merchant = clinicId;
    }
    
    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] 
            } 
          },
          cancelled: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] 
            } 
          },
          ongoing: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "Confirm"] }, 1, 0] 
            } 
          },
          uniqueClinics: { $addToSet: "$merchant" }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          completed: 1,
          cancelled: 1,
          ongoing: 1,
          totalClinics: { $size: "$uniqueClinics" }
        }
      }
    ]);
    
    // If no appointments match the query, return zeros
    if (stats.length === 0) {
      return res.json({
        total: 0,
        completed: 0,
        cancelled: 0,
        ongoing: 0,
        totalClinics: 0
      });
    }
    
    res.json(stats[0]);
    
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({ message: 'Server error while fetching appointment stats' });
  }
};