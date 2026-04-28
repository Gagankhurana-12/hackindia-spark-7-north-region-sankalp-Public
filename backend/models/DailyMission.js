const mongoose = require('mongoose');

const dailyMissionSchema = new mongoose.Schema(
    {
        childId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Child',
            required: true,
            index: true,
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true,
        },
        ageMode: {
            type: String,
            enum: ['sensory', 'explorer', 'builder'],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        curiosityHook: {
            type: String,
            required: true,
        },
        instructions: [
            {
                step: String,
                icon: String, // e.g., 'balloon', 'tape', 'rocket'
                label: String,
            }
        ],
        whatYouWillLearn: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending',
        },
        rewardClaimed: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

// Ensure one mission per child per day
dailyMissionSchema.index({ childId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyMission', dailyMissionSchema);
