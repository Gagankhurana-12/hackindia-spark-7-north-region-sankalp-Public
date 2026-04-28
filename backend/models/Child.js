const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Child name is required'],
    trim: true,
    minlength: [2, 'Child name must be at least 2 characters long']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [3, 'Age must be at least 3'],
    max: [17, 'Age must be at most 17']
  },
  interests: [{
    type: String, // e.g., 'space', 'ai', 'dinos'
    lowercase: true,
    trim: true
  }],
  level: {
    type: Number,
    default: 1, // Start at level 1
    min: 1
  },
  xp: {
    type: Number,
    default: 0,
    min: 0
  },
  mode: {
    type: String,
    enum: {
      values: ['strict', 'balanced', 'fun'],
      message: '{VALUE} is not a valid mode'
    },
    default: 'balanced'
  },
  language: {
    type: String,
    enum: {
      values: ['english', 'hindi'],
      message: '{VALUE} is not a supported language'
    },
    default: 'english',
    lowercase: true,
    trim: true
  },
  linkCode: {
    type: String,
    required: [true, 'Linking code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 6,
    maxlength: 6,
    index: true // Optimize queries for finding child via link code
  },
  avatarColor: {
    type: String,
    trim: true,
    default: function () {
      const palette = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];
      return palette[Math.floor(Math.random() * palette.length)];
    }
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true,
    index: true // Speed up fetching children by their parent
  },
  topicsWatched: [{
    type: String, // Topics the child has watched videos on
    lowercase: true,
    trim: true
  }]
}, { 
  timestamps: true // Automatically manage createdAt and updatedAt fields
});

module.exports = mongoose.model('Child', childSchema);