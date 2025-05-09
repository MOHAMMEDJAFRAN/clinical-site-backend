// controllers/user/availability.controller.js
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');
const Appointment = require('../../models/appointment.model');

exports.checkAvailability = async (req, res) => {
  try {
    const { doctorName, city, date } = req.body;

    // 1. Find the doctor by name and city
    const doctor = await Doctor.findOne({ 
      name: { $regex: new RegExp(doctorName, 'i') },
      city 
    });

    if (!doctor) {
      return res.status(404).json({ 
        isAvailable: false,
        message: 'Doctor not found in the specified city'
      });
    }

    // 2. Check if doctor has active shifts on this date
    const shifts = await ShiftTime.find({
      doctor: doctor._id,
      date,
      status: 'Available',
      isActive: true
    });

    if (shifts.length === 0) {
      return res.status(200).json({ 
        isAvailable: false,
        message: 'No available shifts for this date'
      });
    }

    // 3. Check appointment slots availability
    const existingAppointments = await Appointment.countDocuments({
      doctor: doctor._id,
      appointmentDate: date,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    // Assuming each shift can handle 10 appointments (adjust as needed)
    const maxAppointments = shifts.length * 10;
    const isAvailable = existingAppointments < maxAppointments;

    res.status(200).json({
      isAvailable,
      availableSlots: isAvailable ? maxAppointments - existingAppointments : 0,
      doctorId: doctor._id,
      message: isAvailable ? 'Appointments available' : 'No available slots'
    });

  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ 
      isAvailable: false,
      message: 'Error checking availability'
    });
  }
};