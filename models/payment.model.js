// models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientContact: {
    type: String,
    required: true
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  medicationFee: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Online'],
    default: 'Cash'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save hook to generate reference number and calculate total
PaymentSchema.pre('save', function(next) {
  if (!this.referenceNumber) {
    this.referenceNumber = `PAY-${Date.now().toString().slice(-6)}`;
  }
  this.totalAmount = this.consultationFee + this.medicationFee;
  next();
});

// Static method to create payment from appointment
PaymentSchema.statics.createFromAppointment = async function(appointmentId, paymentData, userId) {
  const appointment = await mongoose.model('Appointment').findById(appointmentId)
    .populate('merchant')
    .populate('doctor');

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const payment = new this({
    appointment: appointment._id,
    merchant: appointment.merchant._id,
    doctor: appointment.doctor._id,
    patientName: appointment.patientName,
    patientContact: appointment.patientContact,
    consultationFee: paymentData.consultationFee,
    medicationFee: paymentData.medicationFee,
    paymentMethod: paymentData.paymentMethod || 'Cash',
    createdBy: userId
  });

  await payment.save();
  
  // Update appointment status
  appointment.status = 'Completed';
  await appointment.save();

  return payment;
};

// Format receipt data for frontend
PaymentSchema.methods.getReceiptData = function() {
  return {
    receiptNumber: this.referenceNumber,
    date: this.paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    patientName: this.patientName,
    consultationFee: this.consultationFee,
    medicationFee: this.medicationFee,
    totalAmount: this.totalAmount,
    paymentMethod: this.paymentMethod
  };
};

module.exports = mongoose.model('Payment', PaymentSchema);