const mongoose = require('mongoose');
const Doctor = require('../../models/doctor.model');
const Merchant = require('../../models/clinical.model');
const ShiftTime = require('../../models/shift.model');
const { uploadToCloudinary } = require('../../utils/cloudinary');

// 🔁 Helper: Upsert shift times with validation and transaction support
const upsertShiftTimes = async (doctorId, shiftTimes, merchantId, session = null) => {
  if (!shiftTimes || !Array.isArray(shiftTimes)) {
    throw new Error('Shift times must be provided as an array');
  }

  // Validate each shift time
  const validatedShifts = shiftTimes.map((shift, index) => {
    if (!shift.timeRange || !shift.date) {
      throw new Error(`Shift at index ${index} must have timeRange and date`);
    }
    
    // Validate timeRange format (e.g., "9.00am - 5.00pm")
    if (!/^\d{1,2}\.\d{2}(am|pm)\s*-\s*\d{1,2}\.\d{2}(am|pm)$/i.test(shift.timeRange)) {
      throw new Error(`Invalid timeRange format at index ${index}. Use format like "9.00am - 5.00pm"`);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
      throw new Error(`Invalid date format at index ${index}. Use YYYY-MM-DD format`);
    }

    return {
      merchant: merchantId,
      doctor: doctorId,
      shiftName: shift.shiftName || `Shift ${index + 1}`,
      timeRange: shift.timeRange.trim(),
      date: shift.date,
      status: shift.status || 'Available',
      isActive: shift.isActive !== false
    };
  });

  // Get unique dates being updated
  const datesToUpdate = [...new Set(validatedShifts.map(s => s.date))];

  // Deactivate existing shifts for these dates (soft delete)
  await ShiftTime.updateMany(
    { 
      doctor: doctorId,
      date: { $in: datesToUpdate }
    },
    { isActive: false },
    { session }
  );

  // Process each new shift time
  const updatedShiftIds = [];
  
  for (const shift of validatedShifts) {
    const updatedShift = await ShiftTime.findOneAndUpdate(
      { 
        doctor: doctorId, 
        date: shift.date,
        timeRange: shift.timeRange
      },
      shift,
      { 
        upsert: true, 
        new: true, 
        runValidators: true,
        session 
      }
    );
    updatedShiftIds.push(updatedShift._id);
  }

  return updatedShiftIds;
};

// ✅ Create a new doctor (without shift times)
exports.createDoctor = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { merchantId } = req.params;
    const { 
      name, 
      gender, 
      phoneNumber, 
      email, 
      city, 
      clinicName, 
      status
    } = req.body;

    // Validate merchant exists
    const merchant = await Merchant.findById(merchantId).session(session);
    if (!merchant) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: 'Merchant not found' 
      });
    }

    // Handle photo upload
    let photoUrl = '';
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'doctor-photos');
        photoUrl = result.secure_url;
      } catch (uploadError) {
        await session.abortTransaction();
        return res.status(500).json({
          success: false,
          message: 'Failed to upload photo'
        });
      }
    }

    // Create doctor
    const doctor = new Doctor({
      merchant: merchantId,
      name,
      gender,
      phoneNumber,
      email,
      city,
      clinicName: clinicName || merchant.clinicname,
      photo: photoUrl,
      status: status || 'Available',
      shiftTimes: [] // Initialize empty shiftTimes array
    });

    await doctor.save({ session });
    await session.commitTransaction();

    res.status(201).json({ 
      success: true, 
      data: doctor 
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get all doctors for a clinic with active shifts
exports.getDoctorsByClinic = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // Validate merchant exists
    const merchantExists = await Merchant.exists({ _id: merchantId });
    if (!merchantExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Merchant not found' 
      });
    }

    const doctors = await Doctor.find({ merchant: merchantId })
      .populate({
        path: 'shiftTimes',
        match: { isActive: true },
        select: 'shiftName timeRange date status isActive'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ✅ Get single doctor details
exports.getDoctorDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id)
      .populate({
        path: 'shiftTimes',
        match: { isActive: true },
        select: 'shiftName timeRange date status isActive'
      })
      .populate('merchant', 'clinicname address');

    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ✅ Update a doctor's details and shifts
exports.updateDoctor = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { shiftTimes, ...doctorData } = req.body;

    // Check if doctor exists
    const existingDoctor = await Doctor.findById(id).session(session);
    if (!existingDoctor) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Handle photo upload if provided
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer.toString('base64'), 
        'doctors-photos'
      );
      doctorData.photo = result.secure_url;
    }

    // Update doctor details
    const doctor = await Doctor.findByIdAndUpdate(
      id, 
      doctorData, 
      { 
        new: true, 
        runValidators: true,
        session 
      }
    );

    // Process shift times if provided
    if (shiftTimes && shiftTimes.length > 0) {
      const updatedShiftIds = await upsertShiftTimes(id, shiftTimes, doctor.merchant, session);
      doctor.shiftTimes = updatedShiftIds;
      await doctor.save({ session });
    }

    await session.commitTransaction();

    // Get the full updated doctor data
    const updatedDoctor = await Doctor.findById(id)
      .populate({
        path: 'shiftTimes',
        match: { isActive: true },
        select: 'shiftName timeRange date status isActive'
      });

    res.status(200).json({ 
      success: true, 
      data: updatedDoctor 
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ Delete a doctor and their shifts
exports.deleteDoctor = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctor = await Doctor.findById(id).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Delete all associated shift times
    await ShiftTime.deleteMany({ doctor: id }).session(session);

    // Delete the doctor
    await Doctor.findByIdAndDelete(id).session(session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Doctor and associated shift times deleted successfully'
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✅ Get all active shifts for a doctor
exports.getDoctorShifts = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if doctor exists
    const doctorExists = await Doctor.exists({ _id: id });
    if (!doctorExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    const shifts = await ShiftTime.find({ 
      doctor: id,
      isActive: true 
    }).sort({ date: 1, timeRange: 1 });

    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ✅ Get doctor availability for specific date
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required (YYYY-MM-DD)'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Get active shifts for the specified date
    const shifts = await ShiftTime.find({
      doctor: id,
      date: date,
      isActive: true
    }).sort({ timeRange: 1 });

    res.status(200).json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        doctorStatus: doctor.status,
        date: date,
        shifts: shifts.map(s => ({
          id: s._id,
          shiftName: s.shiftName,
          timeRange: s.timeRange,
          status: s.status
        }))
      }
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ✨ Add shift times for a specific doctor
exports.addDoctorShifts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { shiftTimes } = req.body;

    // Validate input
    if (!shiftTimes || !Array.isArray(shiftTimes)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Shift times array is required'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(id).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Get existing shifts for these dates to prevent duplicates
    const existingDates = [...new Set(shiftTimes.map(s => s.date))];
    const existingShifts = await ShiftTime.find({
      doctor: id,
      date: { $in: existingDates },
      isActive: true
    }).session(session);

    const createdShifts = [];
    
    for (const shift of shiftTimes) {
      // Basic validation
      if (!shift.date || !shift.timeRange) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Each shift must have date and timeRange'
        });
      }

      // Check for duplicate time ranges
      const isDuplicate = existingShifts.some(
        s => s.date === shift.date && s.timeRange === shift.timeRange
      );
      
      if (isDuplicate) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Duplicate shift found for ${shift.date} with time ${shift.timeRange}`
        });
      }

      // Create new shift with the provided shiftName
      const newShift = new ShiftTime({
        merchant: doctor.merchant,
        doctor: id,
        date: shift.date,
        timeRange: shift.timeRange,
        shiftName: shift.shiftName, // Use the provided shift name
        status: shift.status || 'Available',
        isActive: true
      });

      const savedShift = await newShift.save({ session });
      createdShifts.push(savedShift);

      // Add to doctor's shiftTimes array
      doctor.shiftTimes.push(savedShift._id);
    }

    await doctor.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Shifts added successfully',
      data: createdShifts
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding shifts:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✨ Update existing shift times for a doctor
exports.updateDoctorShifts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: doctorId } = req.params;
    const { shiftUpdates } = req.body;

    // Validate input
    if (!shiftUpdates || !Array.isArray(shiftUpdates)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'shiftUpdates array is required with shiftId and updates'
      });
    }

    // Verify doctor exists
    const doctorExists = await Doctor.exists({ _id: doctorId }).session(session);
    if (!doctorExists) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    const updatedShifts = [];
    
    // Process each update
    for (const update of shiftUpdates) {
      if (!update.shiftId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Each update must include a shiftId'
        });
      }

      // Find and validate the shift
      const shift = await ShiftTime.findOne({
        _id: update.shiftId,
        doctor: doctorId
      }).session(session);

      if (!shift) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Shift ${update.shiftId} not found for this doctor`
        });
      }

      // Update fields
      if (update.updates.timeRange) shift.timeRange = update.updates.timeRange;
      if (update.updates.status) shift.status = update.updates.status;
      if (update.updates.date) shift.date = update.updates.date;
      if (update.updates.shiftName) shift.shiftName = update.updates.shiftName;
      if (typeof update.updates.isActive === 'boolean') shift.isActive = update.updates.isActive;

      const updatedShift = await shift.save({ session });
      updatedShifts.push(updatedShift);
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Shifts updated successfully',
      data: updatedShifts
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating shifts:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update shifts',
      error: error 
    });
  } finally {
    session.endSession();
  }
};

// ✨ Remove shifts for a doctor
exports.removeDoctorShifts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { shiftIds } = req.body;

    if (!shiftIds || !Array.isArray(shiftIds)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Shift IDs array is required'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(id).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Soft delete the shifts (set isActive to false)
    const { modifiedCount } = await ShiftTime.updateMany(
      { 
        _id: { $in: shiftIds },
        doctor: id
      },
      { isActive: false },
      { session }
    );

    // Remove from doctor's shiftTimes array
    doctor.shiftTimes = doctor.shiftTimes.filter(
      shiftId => !shiftIds.includes(shiftId.toString())
    );
    
    await doctor.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Shifts removed successfully',
      data: {
        removedCount: modifiedCount
      }
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};

// ✨ Replace all shifts for a doctor on specific dates
exports.replaceDoctorShifts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { shiftTimes } = req.body;

    if (!shiftTimes || !Array.isArray(shiftTimes)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Shift times array is required'
      });
    }

    // Check if doctor exists and get merchant ID
    const doctor = await Doctor.findById(id).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }

    // Get unique dates from the new shifts
    const datesToReplace = [...new Set(shiftTimes.map(s => s.date))];

    // Deactivate all existing shifts for these dates
    await ShiftTime.updateMany(
      { 
        doctor: id,
        date: { $in: datesToReplace }
      },
      { isActive: false },
      { session }
    );

    // Add the new shifts
    const newShiftIds = await upsertShiftTimes(
      id, 
      shiftTimes, 
      doctor.merchant, 
      session
    );

    // Get existing shifts that aren't for the dates we're replacing
    const existingShifts = await ShiftTime.find({
      doctor: id,
      date: { $nin: datesToReplace },
      isActive: true
    }).session(session);

    // Update doctor's shiftTimes array
    doctor.shiftTimes = [
      ...existingShifts.map(s => s._id),
      ...newShiftIds
    ];
    await doctor.save({ session });

    await session.commitTransaction();

    // Get the new shifts
    const newShifts = await ShiftTime.find({
      _id: { $in: newShiftIds }
    }).session(session);

    res.status(200).json({
      success: true,
      message: 'Shifts replaced successfully',
      data: newShifts
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    session.endSession();
  }
};