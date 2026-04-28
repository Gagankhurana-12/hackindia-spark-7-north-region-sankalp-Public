const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true // Fast lookup for child's history
  },
  videoId: {
    type: String,
    required: [true, 'YouTube video ID is required'],
    trim: true,
    index: true // Could be used to measure video popularity
  },
  completion: {
    type: Number, // Percentage of video completed
    default: 0,
    min: 0,
    max: 100
  },
  videoTitle: {
    type: String,
    trim: true,
    default: ''
  },
  videoThumbnail: {
    type: String,
    trim: true,
    default: ''
  },
  videoChannel: {
    type: String,
    trim: true,
    default: ''
  },
  videoDuration: {
    type: String,
    trim: true,
    default: ''
  },
  videoTopic: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  lastWatchedTime: {
    type: Number, // Last timestamp in seconds where video was watched
    default: 0,
    min: 0
  },
  quizScore: {
    type: Number, // Score out of 100 (or whichever metrics you pick)
    default: 0,
    min: 0,
    max: 100
  }
}, { 
  timestamps: true // Automatically generate timestamps for when a video was watched
});

module.exports = mongoose.model('WatchHistory', watchHistorySchema);