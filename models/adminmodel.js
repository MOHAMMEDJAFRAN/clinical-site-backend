const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
      'Please add a valid phone number'
    ]
  },
  profileImage: {
    type: String,
    default: null
  },
  adminType: {
    type: String,
    enum: ['superadmin', 'admin', 'support'],
    default: 'admin'
  },
  permissions: {
    type: [String],
    default: []
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update timestamps on save
AdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Reverse populate with virtuals
AdminSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Text index for search
AdminSchema.index({
  name: 'text',
  phoneNumber: 'text'
});

module.exports = mongoose.model('Admin', AdminSchema);