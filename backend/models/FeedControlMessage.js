const mongoose = require('mongoose');

const feedControlMessageSchema = new mongoose.Schema(
    {
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Parent',
            required: true,
            index: true,
        },
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
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 4000,
        },
        actions: [
            {
                type: {
                    type: String,
                    enum: ['add_interest', 'remove_interest', 'add_video', 'block_video', 'review_video'],
                    required: true,
                },
                payload: { type: mongoose.Schema.Types.Mixed, default: {} },
                appliedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

feedControlMessageSchema.index({ parentId: 1, childId: 1, createdAt: 1 });

module.exports = mongoose.model('FeedControlMessage', feedControlMessageSchema);
