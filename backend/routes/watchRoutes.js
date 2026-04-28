// watchRoutes.js
// Routes for watch tracking, resume, and next video recommendations

const express = require('express');
const router = express.Router();
const {
    trackWatch,
    getResumeInfo,
    getWatchHistory,
    getNextRecommendation,
} = require('../controllers/watchController');

// Track watch progress
// POST /api/watch/track
// Body: { videoId, completion, lastWatchedTime, videoTopic? }
router.post('/track', trackWatch);

// Get resume info for a video
// GET /api/watch/resume/:videoId
router.get('/resume/:videoId', getResumeInfo);

// Get child's watch history
// GET /api/watch/history?limit=20
router.get('/history', getWatchHistory);

// Get next recommended video based on learning path
// POST /api/watch/next-recommendation
// Body: { currentVideoId, allVideos: [...] }
router.post('/next-recommendation', getNextRecommendation);

module.exports = router;