// controllers/doctorController.js
const Doctor = require('../../models/doctor.model');
const ShiftTime = require('../../models/shift.model');
const Appointment = require('../../models/appointment.model');
const QueueCounter = require('../../models/queueCounter.model');
const Merchant = require('../../models/clinical.model'); // Make sure to import Merchant model

// Get all doctors with filters
exports.getAllDoctors = async (req, res) => {
  try {
    const { doctor, city, date } = req.query;
    
    // First, find merchants that match the city filter if provided
    let merchantIds = null;
    if (city) {
      const merchants = await Merchant.find({ city });
      merchantIds = merchants.map(m => m._id);
    }

    const query = {};
    if (doctor) {
      query.name = { $regex: doctor, $options: 'i' };
    }
    if (city) {
      query.merchant = { $in: merchantIds };
    }

    // Find doctors matching the basic filters
    const doctors = await Doctor.find(query).populate('merchant', 'clinicname city');

    // If date is provided, we need to check shift times
    if (date) {
      const shiftTimes = await ShiftTime.find({ 
        date,
        status: 'Available',
        isActive: true
      }).populate('doctor');

      // Filter doctors who have available shifts on the given date
      const doctorIdsWithShifts = shiftTimes.map(st => st.doctor._id.toString());
      const filteredDoctors = doctors.filter(doc => 
        doctorIdsWithShifts.includes(doc._id.toString())
      );

      // Add shift times to each doctor
      const doctorsWithShifts = filteredDoctors.map(doc => {
        const docShifts = shiftTimes.filter(st => 
          st.doctor._id.toString() === doc._id.toString()
        );
        return {
          ...doc.toObject(),
          shift_time_1: docShifts[0]?.timeRange || null,
          shift_time_2: docShifts[1]?.timeRange || null,
          shift_time_3: docShifts[2]?.timeRange || null,
          availableDate: date
        };
      });

      return res.json(doctorsWithShifts);
    }

    // If no date filter, return all matching doctors
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get single doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('merchant', 'clinicname city');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getClinicCities = async (req, res) => {
  try {
    const cities = await Merchant.distinct('city');
    res.json(cities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};