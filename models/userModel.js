// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'merchant'],
    default: 'user'
  },
  isVerified: { 
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
  },
  lastLoginAt: {
    type: Date
  }
}, 
// {
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// }
);

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Update timestamp
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// // Virtual populate
// UserSchema.virtual('adminProfile', {
//   ref: 'Admin',
//   localField: '_id',
//   foreignField: 'user',
//   justOne: true
// });

// UserSchema.virtual('merchantProfile', {
//   ref: 'Merchant',
//   localField: '_id',
//   foreignField: 'user',
//   justOne: true
// });

module.exports = mongoose.model('User', UserSchema);