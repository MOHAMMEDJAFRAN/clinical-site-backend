const Appointment = require('../../models/appointment.model');
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');
const QueueCounter = require('../../models/queueCounter.model');
const Merchant = require('../../models/clinical.model');

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

// Get merchant details
exports.getMerchantDetails = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId)
      .select('clinicname city address phoneNumber email');
    
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json({
      name: merchant.clinicname,
      address: `${merchant.address}, ${merchant.city}`,
      phone: merchant.phoneNumber,
      email: merchant.email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all appointments for a specific clinic
exports.getClinicAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ merchant: req.params.merchantId })
      .populate('doctor', 'name specialization')
      .populate('shiftTime', 'shiftName timeRange')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new appointment for a clinic
exports.createClinicAppointment = async (req, res) => {
  try {
    const { doctorId, shiftTimeId, patientName, patientGender, patientAge, 
           patientContact, appointmentDate, appointmentTime } = req.body;

    // Validate input
    if (!doctorId || !shiftTimeId || !patientName || !patientGender || 
        !patientAge || !patientContact || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if doctor exists and belongs to this merchant
    const doctor = await Doctor.findOne({ 
      _id: doctorId, 
      merchant: req.params.merchantId 
    });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found in this clinic' });
    }

    // Check if shift time exists and is available
    const shiftTime = await ShiftTime.findOne({
      _id: shiftTimeId,
      merchant: req.params.merchantId,
      doctor: doctorId
    });
    
    if (!shiftTime || shiftTime.status !== 'Available' || !shiftTime.isActive) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Get or create queue counter
    const queueCounter = await getQueueCounter(doctorId, shiftTimeId, appointmentDate);
    queueCounter.currentQueue += 1;
    await queueCounter.save();

    // Generate reference number
    const referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create new appointment
    const appointment = new Appointment({
      merchant: req.params.merchantId,
      doctor: doctorId,
      shiftTime: shiftTimeId,
      patientName,
      patientGender,
      patientAge,
      patientContact,
      appointmentDate,
      appointmentTime,
      queueNumber: queueCounter.currentQueue,
      referenceNumber,
      status: 'Confirm'
    });

    await appointment.save();

    // Return appointment details with doctor info
    const appointmentWithDoctor = await Appointment.findById(appointment._id)
      .populate('doctor', 'name specialization')
      .populate('shiftTime', 'shiftName timeRange');

    res.status(201).json(appointmentWithDoctor);

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
      merchant: req.params.merchantId,
      referenceNumber: req.params.reference 
    })
    .populate('doctor', 'name specialization')
    .populate('shiftTime', 'shiftName timeRange');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get doctors for a specific clinic
exports.getClinicDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ merchant: req.params.merchantId })
      .select('name gender specialization phoneNumber')
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get shift times for a specific doctor in a clinic
exports.getDoctorShiftTimes = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const shiftTimes = await ShiftTime.find({
      merchant: req.params.merchantId,
      doctor: req.params.doctorId,
      date,
      status: 'Available',
      isActive: true
    }).sort({ shiftName: 1 });

    res.json(shiftTimes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};