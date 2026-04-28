const mongoose = require('mongoose');

const conversationTurnSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['general', 'video'],
      default: 'general',
      index: true,
    },
    videoId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    source: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
  },
  { timestamps: true }
);

conversationTurnSchema.index({ childId: 1, createdAt: -1 });
conversationTurnSchema.index({ childId: 1, mode: 1, videoId: 1, createdAt: -1 });

module.exports = mongoose.model('ConversationTurn', conversationTurnSchema);
