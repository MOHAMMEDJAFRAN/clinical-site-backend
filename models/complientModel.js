const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  clinicName: {
    type: String,
    required: true,
    trim: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  contactInfo: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  dateOfOccurrence: {
    type: Date,
    required: true
  },
  submittedOn: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  notes: [{
    content: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    default: 'clinic'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },  // Ensure virtuals are included when converted to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converted to objects
});

// Update timestamp before saving
ComplaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add virtual for last reply (using your existing notes array)
ComplaintSchema.virtual('lastReply').get(function() {
  if (this.notes && this.notes.length > 0) {
    // Return the most recent note (sorted by addedAt)
    const sortedNotes = [...this.notes].sort((a, b) => b.addedAt - a.addedAt);
    return {
      content: sortedNotes[0].content,
      repliedBy: sortedNotes[0].addedBy,
      repliedAt: sortedNotes[0].addedAt
    };
  }
  return null;
});

module.exports = mongoose.model('Complaint', ComplaintSchema);