// models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
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
  shiftTime: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTime',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientGender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  patientContact: {
    type: String,
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  appointmentDate: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  queueNumber: {
    type: Number,
    required: true
  },
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Confirm', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

AppointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', AppointmentSchema);