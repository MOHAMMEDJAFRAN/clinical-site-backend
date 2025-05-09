const mongoose = require('mongoose');

const ShiftTimeSchema = new mongoose.Schema({
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
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  shiftName: {
    type: String,
    required: true,
    enum: ['Shift 1', 'Shift 2', 'Shift 3']
  },
  timeRange: {
    type: String, //Formate: 9.00am - 10.00pm
    required: true
  },
  
  status: {
    type: String,
    enum: ['Available', 'Unavailable'],
    default: 'Available'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: () => Date.now()
  },
  updatedAt: {
    type: Date,
    default: () => Date.now()
  }
});

module.exports = mongoose.model('ShiftTime', ShiftTimeSchema);
