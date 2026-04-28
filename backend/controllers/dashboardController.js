const mongoose = require('mongoose');
const Child = require('../models/Child');
const WatchHistory = require('../models/WatchHistory');
const ConversationTurn = require('../models/ConversationTurn');
const LearningMemory = require('../models/LearningMemory');
const ActivityTask = require('../models/ActivityTask');
const { hydrateWatchHistory } = require('../services/youtubeMetadata');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfDaysAgo = (n) => {
    const d = startOfToday();
    d.setDate(d.getDate() - n);
    return d;
};

const ensureChildBelongsToParent = async (childId, parentId) => {
    if (!mongoose.Types.ObjectId.isValid(childId)) return null;
    return Child.findOne({ _id: childId, parentId }).lean();
};

exports.getOverview = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId } = req.query;
        if (!childId) return res.status(400).json({ message: 'childId is required' });

        const child = await ensureChildBelongsToParent(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        const childObjectId = new mongoose.Types.ObjectId(childId);
        const today = startOfToday();
        const weekStart = startOfDaysAgo(6); // last 7 days inclusive

        const [todayWatchAgg, aiInteractionsToday, factsLearnedToday, recentVideosRaw, latestTurn, weeklyAgg, pendingTask] = await Promise.all([
            WatchHistory.aggregate([
                { $match: { childId: childObjectId, createdAt: { $gte: today } } },
                {
                    $group: {
                        _id: null,
                        videosWatched: { $sum: 1 },
                        totalSeconds: { $sum: { $ifNull: ['$lastWatchedTime', 0] } },
                    },
                },
            ]),
            ConversationTurn.countDocuments({ childId: childObjectId, createdAt: { $gte: today } }),
            LearningMemory.countDocuments({ childId: childObjectId, lastInteractionAt: { $gte: today } }),
            WatchHistory.find({ childId: childObjectId })
                .sort({ updatedAt: -1 })
                .limit(5)
                .lean(),
            ConversationTurn.findOne({ childId: childObjectId }).sort({ createdAt: -1 }).lean(),
            WatchHistory.aggregate([
                { $match: { childId: childObjectId, createdAt: { $gte: weekStart } } },
                {
                    $group: {
                        _id: {
                            y: { $year: '$createdAt' },
                            m: { $month: '$createdAt' },
                            d: { $dayOfMonth: '$createdAt' },
                        },
                        seconds: { $sum: { $ifNull: ['$lastWatchedTime', 0] } },
                    },
                },
            ]),
            ActivityTask.findOne({ childId: childObjectId, status: 'pending' })
                .sort({ assignedAt: -1 })
                .lean(),
        ]);

        const todayStats = {
            videosWatched: todayWatchAgg[0]?.videosWatched || 0,
            totalMinutes: Math.round((todayWatchAgg[0]?.totalSeconds || 0) / 60),
            aiInteractions: aiInteractionsToday,
            factsLearned: factsLearnedToday,
        };

        const hydratedRecent = await hydrateWatchHistory(recentVideosRaw);
        const recentVideos = hydratedRecent.map((w) => ({
            videoId: w.videoId,
            title: w.videoTitle || 'Untitled video',
            thumbnail: w.videoThumbnail || '',
            watchedAt: w.updatedAt || w.createdAt,
            percentWatched: Math.round(w.completion || 0),
            conceptsExtracted: w.videoTopic ? [w.videoTopic] : [],
        }));

        let latestAIHighlight = null;
        if (latestTurn) {
            const turns = await ConversationTurn.find({
                childId: childObjectId,
                videoId: latestTurn.videoId || '',
            })
                .sort({ createdAt: -1 })
                .limit(3)
                .lean();

            const messages = turns.reverse().map((t) => ({ role: t.role, content: t.content }));

            let videoTitle = '';
            if (latestTurn.videoId) {
                const watch = await WatchHistory.findOne({ childId: childObjectId, videoId: latestTurn.videoId })
                    .select('videoTitle')
                    .lean();
                videoTitle = watch?.videoTitle || '';
            }

            const recentFacts = await LearningMemory.find({ childId: childObjectId })
                .sort({ lastInteractionAt: -1 })
                .limit(3)
                .select('topic summary')
                .lean();

            latestAIHighlight = {
                videoTitle: videoTitle || (latestTurn.mode === 'general' ? 'General chat' : ''),
                messages,
                factsEmbedded: recentFacts.map((f) => f.summary),
            };
        }

        const minutesByKey = new Map();
        weeklyAgg.forEach((row) => {
            const key = `${row._id.y}-${row._id.m}-${row._id.d}`;
            minutesByKey.set(key, Math.round((row.seconds || 0) / 60));
        });

        const weeklyMinutes = [];
        for (let i = 6; i >= 0; i--) {
            const day = startOfDaysAgo(i);
            const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
            weeklyMinutes.push({
                date: DAY_LABELS[day.getDay()],
                minutes: minutesByKey.get(key) || 0,
            });
        }

        const activityTask = pendingTask
            ? {
                  _id: pendingTask._id,
                  title: pendingTask.title,
                  description: pendingTask.description,
                  rewardMinutes: pendingTask.rewardMinutes,
                  status: pendingTask.status,
              }
            : null;

        res.json({ todayStats, recentVideos, latestAIHighlight, activityTask, weeklyMinutes });
    } catch (error) {
        console.error('getOverview error:', error);
        res.status(500).json({ message: 'Server error retrieving overview' });
    }
};
