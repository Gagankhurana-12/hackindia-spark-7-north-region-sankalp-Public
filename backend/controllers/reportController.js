const mongoose = require('mongoose');
const Child = require('../models/Child');
const WatchHistory = require('../models/WatchHistory');
const ConversationTurn = require('../models/ConversationTurn');
const LearningMemory = require('../models/LearningMemory');
const ActivityTask = require('../models/ActivityTask');

const PERIODS = { today: 0, week: 6, month: 29 };

const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const periodWindow = (period) => {
    const days = PERIODS[period] ?? 6;
    const end = new Date();
    const start = startOfDay(end);
    start.setDate(start.getDate() - days);
    return { start, end, days: days + 1 };
};

const dayKey = (d) => {
    const x = startOfDay(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const ensureChildOwned = async (childId, parentId) => {
    if (!mongoose.Types.ObjectId.isValid(childId)) return null;
    return Child.findOne({ _id: childId, parentId }).lean();
};

const sessionKey = (turn) => {
    const d = startOfDay(turn.createdAt);
    return `${turn.videoId || 'general'}_${dayKey(d)}`;
};

const scoreEngagement = (turns) => {
    if (!turns.length) return 0;
    const userTurns = turns.filter((t) => t.role === 'user');
    const avgLen = userTurns.reduce((a, t) => a + (t.content?.length || 0), 0) / Math.max(userTurns.length, 1);
    return Math.min(100, Math.round(turns.length * 8 + avgLen / 4));
};

const buildInterestTrend = (declared, memories, watchTopics) => {
    const score = new Map();
    declared.forEach((t) => score.set(t.toLowerCase(), 30));
    memories.forEach((m) => {
        const k = m.topic.toLowerCase();
        const recencyBoost = (Date.now() - new Date(m.lastInteractionAt).getTime()) < 7 * 86400000 ? 15 : 0;
        score.set(k, (score.get(k) || 0) + (m.masteryLevel || 1) * 5 + recencyBoost);
    });
    watchTopics.forEach(({ topic, count, lastSeen }) => {
        const k = topic.toLowerCase();
        const recencyBoost = (Date.now() - new Date(lastSeen).getTime()) < 7 * 86400000 ? 10 : 0;
        score.set(k, (score.get(k) || 0) + count * 6 + recencyBoost);
    });
    return Array.from(score.entries())
        .map(([topic, s]) => ({ topic, score: Math.min(100, Math.round(s)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
};

exports.getReports = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId, period = 'week' } = req.query;
        if (!childId) return res.status(400).json({ message: 'childId is required' });

        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        const childOid = new mongoose.Types.ObjectId(childId);
        const { start, end, days } = periodWindow(period);

        const [watch, turns, memoriesAll, completedTasks] = await Promise.all([
            WatchHistory.find({ childId: childOid, createdAt: { $gte: start, $lte: end } }).lean(),
            ConversationTurn.find({ childId: childOid, createdAt: { $gte: start, $lte: end } })
                .sort({ createdAt: 1 })
                .lean(),
            LearningMemory.find({ childId: childOid }).lean(),
            ActivityTask.countDocuments({ childId: childOid, status: 'completed', completedAt: { $gte: start, $lte: end } }),
        ]);

        const sessions = new Map();
        turns.forEach((t) => {
            const k = sessionKey(t);
            if (!sessions.has(k)) sessions.set(k, { videoId: t.videoId || '', turns: [] });
            sessions.get(k).turns.push(t);
        });

        const videoIds = Array.from(new Set(Array.from(sessions.values()).map((s) => s.videoId).filter(Boolean)));
        const videoTitles = new Map();
        if (videoIds.length) {
            const wh = await WatchHistory.find({ childId: childOid, videoId: { $in: videoIds } })
                .select('videoId videoTitle')
                .lean();
            wh.forEach((w) => { if (!videoTitles.has(w.videoId)) videoTitles.set(w.videoId, w.videoTitle); });
        }

        const conversationLogs = Array.from(sessions.values())
            .map((s) => {
                const startedAt = s.turns[0].createdAt;
                const endedAt = s.turns[s.turns.length - 1].createdAt;
                const facts = memoriesAll
                    .filter((m) => new Date(m.lastInteractionAt) >= startedAt && new Date(m.lastInteractionAt) <= new Date(endedAt.getTime() + 60000))
                    .map((m) => m.summary)
                    .slice(0, 6);
                return {
                    videoTitle: s.videoId ? (videoTitles.get(s.videoId) || 'Video chat') : 'General chat',
                    startedAt,
                    engagementScore: scoreEngagement(s.turns),
                    messages: s.turns.map((t) => ({ role: t.role, content: t.content, timestamp: t.createdAt })),
                    factsEmbedded: facts,
                };
            })
            .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

        const topicCounts = new Map();
        const topicLast = new Map();
        watch.forEach((w) => {
            if (!w.videoTopic) return;
            topicCounts.set(w.videoTopic, (topicCounts.get(w.videoTopic) || 0) + 1);
            const cur = topicLast.get(w.videoTopic);
            if (!cur || new Date(w.updatedAt || w.createdAt) > cur) topicLast.set(w.videoTopic, new Date(w.updatedAt || w.createdAt));
        });
        const topConcepts = Array.from(topicCounts.entries())
            .map(([concept, count]) => ({ concept, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        const interestTrend = buildInterestTrend(
            child.interests || [],
            memoriesAll,
            Array.from(topicCounts.entries()).map(([topic, count]) => ({ topic, count, lastSeen: topicLast.get(topic) || start })),
        );
        const dailyByKey = new Map();
        for (let i = days - 1; i >= 0; i--) {
            const d = startOfDay(new Date());
            d.setDate(d.getDate() - i);
            dailyByKey.set(dayKey(d), { date: dayKey(d), minutes: 0, videos: 0, aiInteractions: 0 });
        }
        watch.forEach((w) => {
            const k = dayKey(w.createdAt);
            const row = dailyByKey.get(k);
            if (!row) return;
            row.minutes += Math.round((w.lastWatchedTime || 0) / 60);
            row.videos += 1;
        });
        turns.forEach((t) => {
            const row = dailyByKey.get(dayKey(t.createdAt));
            if (row) row.aiInteractions += 1;
        });
        const dailyBreakdown = Array.from(dailyByKey.values());

        const totalMinutes = dailyBreakdown.reduce((a, r) => a + r.minutes, 0);
        const totalVideos = dailyBreakdown.reduce((a, r) => a + r.videos, 0);
        const avgEngagementScore = conversationLogs.length
            ? Math.round(conversationLogs.reduce((a, c) => a + c.engagementScore, 0) / conversationLogs.length)
            : 0;
        const totalFactsLearned = memoriesAll.filter((m) => new Date(m.lastInteractionAt) >= start).length;

        res.json({
            summary: {
                totalMinutes,
                totalVideos,
                avgEngagementScore,
                totalFactsLearned,
                activitiesCompleted: completedTasks,
            },
            topConcepts,
            interestTrend,
            dailyBreakdown,
            conversationLogs,
            childName: child.name,
        });
    } catch (error) {
        console.error('getReports error:', error);
        res.status(500).json({ message: 'Server error generating report' });
    }
};
