const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Exclude password from query results by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
  },
  preferences: {
    mode: {
      type: String,
      enum: ['strict', 'balanced', 'fun'],
      default: 'balanced'
    },
    monitorActivity: { type: Boolean, default: true },
    aiActsAsParent: { type: Boolean, default: true }
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child'
  }]
}, { 
  timestamps: true // Automatically manage createdAt and updatedAt fields
});

module.exports = mongoose.model('Parent', parentSchema);