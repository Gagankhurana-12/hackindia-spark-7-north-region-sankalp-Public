// watchController.js
// Handles watch tracking, resume, and next video recommendations

const WatchHistory = require('../models/WatchHistory');
const Child = require('../models/Child');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { hydrateWatchHistory, isMeaningful } = require('../services/youtubeMetadata');

dotenv.config();

function parseBearerToken(req) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    return header.slice(7).trim() || null;
}

/**
 * POST /api/watch/track
 * Track video watch progress and completion
 */
exports.trackWatch = async (req, res) => {
    try {
        const token = parseBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded?.role !== 'child' || !decoded?.id) {
            return res.status(403).json({ message: 'Only children can track watch history' });
        }

        const {
            videoId,
            completion,
            lastWatchedTime,
            videoTitle,
            videoThumbnail,
            videoChannel,
            videoDuration,
            videoTopic,
        } = req.body;
        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        const completionPercent = Math.max(0, Math.min(100, Number(completion) || 0));
        const watchTime = Number(lastWatchedTime) || 0;

        // Update or create watch history record
        const updated = await WatchHistory.findOneAndUpdate(
            { childId: decoded.id, videoId },
            {
                $set: {
                    completion: completionPercent,
                    lastWatchedTime: watchTime,
                    ...(isMeaningful(videoTitle) ? { videoTitle: String(videoTitle).trim() } : {}),
                    ...(videoThumbnail && !String(videoThumbnail).includes('unsplash.com') ? { videoThumbnail: String(videoThumbnail).trim() } : {}),
                    ...(isMeaningful(videoChannel) ? { videoChannel: String(videoChannel).trim() } : {}),
                    ...(videoDuration ? { videoDuration: String(videoDuration).trim() } : {}),
                    ...(videoTopic ? { videoTopic: String(videoTopic).trim().toLowerCase() } : {}),
                    updatedAt: new Date(),
                },
            },
            { upsert: true, returnDocument: 'after' }
        );

        // If video is almost fully watched (>80%), increment child's topic diversity
        if (completionPercent > 80) {
            const videoTopic = req.body.videoTopic; // Optional: passed from frontend
            if (videoTopic) {
                await Child.findByIdAndUpdate(
                    decoded.id,
                    { $addToSet: { topicsWatched: videoTopic } },
                    { returnDocument: 'after' }
                );
            }
        }

        return res.json({
            status: 'success',
            message: 'Watch progress tracked',
            watch: updated,
        });
    } catch (error) {
        console.error('[watch/track] error:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/watch/resume/:videoId
 * Get resume information for a video (last watched timestamp/completion)
 */
exports.getResumeInfo = async (req, res) => {
    try {
        const token = parseBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded?.role !== 'child' || !decoded?.id) {
            return res.status(403).json({ message: 'Only children can access resume info' });
        }

        const { videoId } = req.params;
        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        const watch = await WatchHistory.findOne({
            childId: decoded.id,
            videoId,
        }).lean();

        if (!watch) {
            return res.json({
                status: 'not-watched',
                resumeTime: 0,
                completion: 0,
            });
        }

        return res.json({
            status: 'watched',
            resumeTime: watch.lastWatchedTime || 0,
            completion: watch.completion || 0,
            lastWatchedAt: watch.updatedAt,
        });
    } catch (error) {
        console.error('[watch/resume] error:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/watch/history
 * Get child's full watch history
 */
exports.getWatchHistory = async (req, res) => {
    try {
        const token = parseBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded?.role !== 'child' || !decoded?.id) {
            return res.status(403).json({ message: 'Only children can access watch history' });
        }

        const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
        const history = await WatchHistory.find({ childId: decoded.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const enrichedHistory = await hydrateWatchHistory(history);

        return res.json({
            status: 'success',
            count: enrichedHistory.length,
            history: enrichedHistory,
        });
    } catch (error) {
        console.error('[watch/history] error:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/watch/next-recommendation
 * Get the next recommended video based on learning path
 * Learning path example: Planets → Gravity → Orbits → Space Physics
 */
exports.getNextRecommendation = async (req, res) => {
    try {
        const token = parseBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded?.role !== 'child' || !decoded?.id) {
            return res.status(403).json({ message: 'Only children can get recommendations' });
        }

        const { currentVideoId, allVideos } = req.body;
        if (!currentVideoId || !Array.isArray(allVideos) || allVideos.length === 0) {
            return res.status(400).json({ message: 'currentVideoId and allVideos are required' });
        }

        // Get child profile
        const child = await Child.findById(decoded.id).select('interests level').lean();
        if (!child) {
            return res.status(404).json({ message: 'Child not found' });
        }

        // Get current video's topic
        const currentVideo = allVideos.find(v => v.id === currentVideoId);
        if (!currentVideo) {
            return res.status(404).json({ message: 'Current video not found in provided list' });
        }

        // Get watch history to exclude watched videos
        const watchHistory = await WatchHistory.find({ childId: decoded.id }).select('videoId').lean();
        const watchedIds = new Set(watchHistory.map(w => w.videoId));

        // Define learning progression paths (topic relationships)
        const learningPaths = {
            'planets': ['gravity', 'orbits', 'space-physics'],
            'gravity': ['orbits', 'space-physics', 'black-holes'],
            'orbits': ['space-physics', 'satellites'],
            'space-physics': ['black-holes', 'relativity'],
            'ai': ['machine-learning', 'neural-networks', 'deep-learning'],
            'machine-learning': ['neural-networks', 'deep-learning', 'AI-ethics'],
            'nature': ['ecosystems', 'animals', 'plants', 'biodiversity'],
            'animals': ['ecosystems', 'habitats', 'endangered-species'],
        };

        const currentTopic = currentVideo.topic?.toLowerCase() || '';
        const nextTopics = learningPaths[currentTopic] || [];

        // Find next videos: same topic progression, not yet watched, matching difficulty/interests
        let nextVideos = allVideos.filter(v => {
            if (watchedIds.has(v.id) || v.id === currentVideoId) return false;
            if (nextTopics.length > 0) {
                return nextTopics.some(topic => v.topic?.toLowerCase().includes(topic));
            }
            // Fallback: suggest videos from same topic
            return v.topic?.toLowerCase().includes(currentTopic);
        });

        // If no topic progression found, fall back to same interests
        if (nextVideos.length === 0) {
            nextVideos = allVideos.filter(v => {
                if (watchedIds.has(v.id) || v.id === currentVideoId) return false;
                return child.interests.some(interest => 
                    v.title?.toLowerCase().includes(interest.toLowerCase())
                );
            });
        }

        // Return top recommendation (can extend to return top 3)
        const nextRecommendation = nextVideos.length > 0 ? nextVideos[0] : null;

        return res.json({
            status: 'success',
            currentVideoId,
            currentTopic,
            nextRecommendation,
            relatedCount: nextVideos.length,
        });
    } catch (error) {
        console.error('[watch/next-recommendation] error:', error);
        return res.status(500).json({ message: error.message });
    }
};