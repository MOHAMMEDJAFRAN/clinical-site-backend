const mongoose = require('mongoose');
const Payment = require('../../models/payment.model');
const Appointment = require('../../models/appointment.model');

// Enhanced validation function
const validatePaymentData = (data) => {
  const { consultationFee, medicationFee, paymentMethod } = data;
  const errors = [];

  if (consultationFee === undefined || typeof consultationFee !== 'number' || consultationFee < 0) {
    errors.push('Consultation fee must be a positive number');
  }

  if (medicationFee === undefined || typeof medicationFee !== 'number' || medicationFee < 0) {
    errors.push('Medication fee must be a positive number');
  }

  if (!paymentMethod || !['Cash', 'Card', 'Online'].includes(paymentMethod)) {
    errors.push('Invalid payment method. Must be one of: Cash, Card, Online');
  }

  return errors;
};

// Helper function to generate reference number
const generateReferenceNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY-${timestamp}-${random}`;
};

exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { appointmentId } = req.params;
    const { consultationFee = 0, medicationFee = 0, paymentMethod = 'Cash' } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    // Validate input data
    const validationErrors = validatePaymentData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId)
      .populate('merchant', 'clinicname')
      .populate('doctor', 'name specialization')
      .session(session);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check appointment status
    if (appointment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already completed'
      });
    }

    // Create payment
    const payment = new Payment({
      appointment: appointment._id,
      merchant: appointment.merchant._id,
      doctor: appointment.doctor._id,
      patientName: appointment.patientName,
      patientContact: appointment.patientContact,
      consultationFee: Number(consultationFee),
      medicationFee: Number(medicationFee),
      paymentMethod,
      referenceNumber: generateReferenceNumber(),
      createdBy: req.user?.id || null,
      totalAmount: Number(consultationFee) + Number(medicationFee)
    });

    // Save payment and update appointment in transaction
    await payment.save({ session });
    
    // Update appointment status
    appointment.status = 'Completed';
    appointment.paymentStatus = 'Paid';
    await appointment.save({ session });

    await session.commitTransaction();

    // Prepare response
    const responseData = {
      success: true,
      payment: {
        ...payment.toObject(),
        doctor: {
          name: appointment.doctor?.name || 'N/A',
          specialization: appointment.doctor?.specialization || 'N/A'
        },
        merchant: {
          clinicName: appointment.merchant?.clinicname || 'N/A'
        }
      },
      appointment: {
        id: appointment._id,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus
      }
    };

    res.status(201).json(responseData);

  } catch (error) {
    await session.abortTransaction();
    
    console.error('Payment creation error:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });

    let statusCode = 500;
    let message = 'Payment processing failed';
    
    if (error instanceof mongoose.Error.ValidationError) {
      statusCode = 400;
      message = 'Validation error';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
    }

    res.status(statusCode).json({
      success: false,
      message: `${message}: ${error.message}`,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.errors 
      })
    });
  } finally {
    session.endSession();
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params; // Changed from appointmentId to paymentId

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }

    const payment = await Payment.findById(paymentId)
      .populate('doctor', 'name specialization')
      .populate('merchant', 'clinicName address phoneNumber')
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment found with this ID'
      });
    }

    // Get appointment details for additional context
    const appointment = await Appointment.findById(payment.appointment)
      .select('patientName patientContact patientAge patientGender appointmentDate appointmentTime')
      .lean();

    const responseData = {
      success: true,
      payment: {
        ...payment,
        patientDetails: {
          name: appointment?.patientName || 'N/A',
          contact: appointment?.patientContact || 'N/A',
          age: appointment?.patientAge || 'N/A',
          gender: appointment?.patientGender || 'N/A'
        },
        appointmentDetails: {
          date: appointment?.appointmentDate || 'N/A',
          time: appointment?.appointmentTime || 'N/A'
        }
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching payment details:', {
      error: error.message,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
};