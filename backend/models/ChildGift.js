const mongoose = require('mongoose');

const childGiftSchema = new mongoose.Schema({
    childId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true,
        index: true
    },
    videoId: {
        type: String,
        required: true
    },
    videoTitle: {
        type: String,
        default: 'A cool video'
    },
    fact: {
        type: String,
        required: true
    },
    relatableThing: {
        type: String,
        required: true
    },
    giftType: {
        type: String,
        required: true,
        enum: ['video', 'rocket', 'star', 'diamond', 'crown', 'magic-box']
    },
    unlockedVideoId: String,
    unlockedVideoTitle: String,
    unlockedVideoThumbnail: String,
    unboxedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ChildGift', childGiftSchema);
