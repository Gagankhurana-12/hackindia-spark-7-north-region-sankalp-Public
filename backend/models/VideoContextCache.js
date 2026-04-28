const mongoose = require('mongoose');

const videoContextCacheSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    transcriptSnippet: {
      type: String,
      trim: true,
      default: '',
      maxlength: 12000,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    source: {
      type: String,
      enum: ['transcript', 'metadata', 'none'],
      default: 'none',
    },
    wowFactors: {
      type: Array,
      default: []
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VideoContextCache', videoContextCacheSchema);
