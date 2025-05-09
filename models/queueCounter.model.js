// models/QueueCounter.js
const mongoose = require('mongoose');

const QueueCounterSchema = new mongoose.Schema({
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
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  currentQueue: {
    type: Number,
    default: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  }
});

QueueCounterSchema.index({ doctor: 1, shiftTime: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('QueueCounter', QueueCounterSchema);