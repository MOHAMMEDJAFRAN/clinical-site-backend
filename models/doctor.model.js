const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  shiftTimes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTime'
  }],
  name: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  photo: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  clinicName: {
    type: String,
    required: true,
    trim: true
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

DoctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Doctor', DoctorSchema);