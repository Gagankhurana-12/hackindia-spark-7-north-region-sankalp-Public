const mongoose = require('mongoose');

const parentVideoSuggestionSchema = new mongoose.Schema(
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
        videoId: {
            type: String,
            required: true,
            trim: true,
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            trim: true,
            default: '',
        },
        note: {
            type: String,
            trim: true,
            default: '',
            maxlength: 400,
        },
    },
    { timestamps: true }
);

parentVideoSuggestionSchema.index({ childId: 1, createdAt: -1 });

module.exports = mongoose.model('ParentVideoSuggestion', parentVideoSuggestionSchema);
