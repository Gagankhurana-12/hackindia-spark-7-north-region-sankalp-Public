const mongoose = require('mongoose');

const activityTaskSchema = new mongoose.Schema(
    {
        childId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Child',
            required: true,
            index: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Parent',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: 600,
        },
        assignedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        rewardMinutes: {
            type: Number,
            min: 0,
            default: 10,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'skipped'],
            default: 'pending',
            index: true,
        },
    },
    { timestamps: true }
);

activityTaskSchema.index({ childId: 1, status: 1, assignedAt: -1 });

module.exports = mongoose.model('ActivityTask', activityTaskSchema);
