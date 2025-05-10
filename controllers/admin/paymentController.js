const mongoose = require('mongoose');
const Payment = require('../../models/payment.model');
const Appointment = require('../../models/appointment.model'); // Make sure to import Appointment model

// Helper function to validate payment data
const validatePaymentData = (data) => {
  const { consultationFee, medicationFee, paymentMethod } = data;
  const errors = [];

  if (typeof consultationFee !== 'number' || consultationFee < 0) {
    errors.push('Consultation fee must be a positive number');
  }

  if (typeof medicationFee !== 'number' || medicationFee < 0) {
    errors.push('Medication fee must be a positive number');
  }

  if (!['Cash', 'Card', 'Online'].includes(paymentMethod)) {
    errors.push('Invalid payment method');
  }

  return errors;
};

exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { appointmentId } = req.params;
    const { consultationFee, medicationFee, paymentMethod = 'Cash' } = req.body;

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
      .populate('merchant')
      .populate('doctor')
      .session(session);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if appointment is already completed
    if (appointment.status === 'completed') {
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
      consultationFee,
      medicationFee,
      paymentMethod,
      referenceNumber: `PAY-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`,
      createdBy: req.user?.id || null // Handle cases where auth might be optional
    });

    // Calculate total
    payment.totalAmount = payment.consultationFee + payment.medicationFee;

    // Save payment and update appointment in transaction
    await payment.save({ session });
    appointment.status = 'completed';
    await appointment.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      payment: payment.getReceiptData(),
      appointmentId: appointment._id,
      updatedStatus: appointment.status
    });

  } catch (error) {
    await session.abortTransaction();
    
    console.error('Payment creation error:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });

    const statusCode = error instanceof mongoose.Error.ValidationError ? 400 : 500;
    const message = statusCode === 400 ? 'Validation error' : 'Payment processing failed';

    res.status(statusCode).json({
      success: false,
      message: `${message}: ${error.message}`,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  } finally {
    session.endSession();
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    const payment = await Payment.findOne({ appointment: appointmentId })
      .sort({ createdAt: -1 })
      .populate('doctor', 'name specialization')
      .populate('merchant', 'clinicName');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment found for this appointment'
      });
    }

    res.json({
      success: true,
      payment: payment.getReceiptData(),
      doctorInfo: {
        name: payment.doctor.name,
        specialization: payment.doctor.specialization
      },
      clinicInfo: {
        name: payment.merchant.clinicName
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', {
      error: error.message,
      params: req.params,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};