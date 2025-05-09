// controllers/shiftTimeController.js
const ShiftTime = require('../../models/shift.model');
const Doctor = require('../../models/doctor.model');

// Get available shift times for a doctor on a specific date
exports.getShiftTimesByDoctorAndDate = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    // Validate input
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and date are required' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get available shift times
    const shiftTimes = await ShiftTime.find({
      doctor: doctorId,
      date,
      status: 'Available',
      isActive: true
    });

    res.json(shiftTimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};