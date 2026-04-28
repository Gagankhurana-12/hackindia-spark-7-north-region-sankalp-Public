const mongoose = require('mongoose');

const learningMemorySchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    masteryLevel: {
      type: Number,
      min: 0,
      max: 10,
      default: 1,
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

learningMemorySchema.index({ childId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('LearningMemory', learningMemorySchema);
