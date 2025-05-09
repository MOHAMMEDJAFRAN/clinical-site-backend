// controllers/appointmentController.js
const Appointment = require('../../models/appointment.model');
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');
const QueueCounter = require('../../models/queueCounter.model');

// Helper function to get or create queue counter
const getQueueCounter = async (doctorId, shiftTimeId, date) => {
  let counter = await QueueCounter.findOne({
    doctor: doctorId,
    shiftTime: shiftTimeId,
    date
  });

  if (!counter) {
    counter = new QueueCounter({
      doctor: doctorId,
      shiftTime: shiftTimeId,
      date,
      currentQueue: 0
    });
    await counter.save();
  }

  return counter;
};

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      shiftTimeId,
      patientName,
      patientGender,
      patientAge,
      patientContact,
      appointmentDate,
      appointmentTime
    } = req.body;

    // Validate input
    if (!doctorId || !shiftTimeId || !patientName || !patientGender || 
        !patientAge || !patientContact || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if shift time exists and is available
    const shiftTime = await ShiftTime.findById(shiftTimeId);
    if (!shiftTime || shiftTime.status !== 'Available' || !shiftTime.isActive) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Get or create queue counter for this doctor and shift time
    const queueCounter = await getQueueCounter(doctorId, shiftTimeId, appointmentDate);
    
    // Increment queue number
    queueCounter.currentQueue += 1;
    await queueCounter.save();

    // Generate reference number
    const referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create new appointment
    const appointment = new Appointment({
      merchant: doctor.merchant,
      doctor: doctorId,
      shiftTime: shiftTimeId,
      patientName,
      patientGender,
      patientAge,
      patientContact,
      appointmentDate,
      appointmentTime,
      queueNumber: queueCounter.currentQueue,
      referenceNumber
    });

    await appointment.save();

    // Return appointment details
    res.status(201).json({
      ...appointment.toObject(),
      doctorName: doctor.name,
      clinicName: doctor.clinicName,
      city: doctor.city
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};// controllers/appointmentController.js
exports.createAppointment = async (req, res) => {
  try {
    const {
      doctor_id,
      shift_time_id,
      patient_name,
      patient_gender,
      patient_age,
      patient_contact,
      appointment_date,
      appointment_time
    } = req.body;

    // Validate input
    if (!doctor_id || !shift_time_id || !patient_name || !patient_gender || 
        !patient_age || !patient_contact || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if doctor exists and has merchant reference
    const doctor = await Doctor.findById(doctor_id).populate('merchant');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    if (!doctor.merchant) {
      return res.status(400).json({ message: 'Doctor is not associated with any clinic' });
    }

    // Check if shift time exists and is available
    const shiftTime = await ShiftTime.findById(shift_time_id);
    if (!shiftTime || shiftTime.status !== 'Available' || !shiftTime.isActive) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Get or create queue counter
    const queueCounter = await getQueueCounter(doctor_id, shift_time_id, appointment_date);
    queueCounter.currentQueue += 1;
    await queueCounter.save();

    // Generate reference number
    const referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create new appointment
    const appointment = new Appointment({
      merchant: doctor.merchant._id, // Use populated merchant reference
      doctor: doctor_id,
      shiftTime: shift_time_id,
      patientName: patient_name,
      patientGender: patient_gender,
      patientAge: patient_age,
      patientContact: patient_contact,
      appointmentDate: appointment_date,
      appointmentTime: appointment_time,
      queueNumber: queueCounter.currentQueue,
      referenceNumber,
      status: 'Confirm' // Set initial status
    });

    await appointment.save();

    // Update shift time availability if needed
    if (shiftTime.maxAppointments && queueCounter.currentQueue >= shiftTime.maxAppointments) {
      shiftTime.status = 'Unavailable';
      await shiftTime.save();
    }

    // Return appointment details
    res.status(201).json({
      ...appointment.toObject(),
      doctorName: doctor.name,
      clinicName: doctor.clinicName,
      city: doctor.city
    });

  } catch (error) {
    console.error("Appointment creation error:", error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get appointment by reference number
exports.getAppointmentByReference = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ 
      referenceNumber: req.params.reference 
    })
    .populate('doctor', 'name clinicName city')
    .populate('shiftTime', 'timeRange');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};