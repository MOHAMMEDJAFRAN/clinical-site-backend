const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const clinicalCenterSchema = new mongoose.Schema({
  clinicName: {
    type: String,
    required: [true, 'Clinical center name is required'],
    trim: true,
    maxlength: [100, 'Clinical center name cannot exceed 100 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  inChargeName: {
    type: String,
    required: [true, 'In-charge name is required'],
    trim: true,
    maxlength: [100, 'In-charge name cannot exceed 100 characters']
  },
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\d\s\+\-\(\)]{8,20}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
clinicalCenterSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Update timestamp when modified
clinicalCenterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate random password
clinicalCenterSchema.statics.generateRandomPassword = function() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each set
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Fill the rest randomly
  for (let i = 0; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Method to compare passwords
clinicalCenterSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const ClinicalCenter = mongoose.model('ClinicalCenter', clinicalCenterSchema);

module.exports = ClinicalCenter;