const express = require('express');
const { getWowFactors, getFeed } = require('../controllers/ppuController');

const router = express.Router();

// GET /api/ppu/wow-factors?videoId=...&age=...&interest=...
router.get('/wow-factors', getWowFactors);

// GET /api/ppu/feed?age=...&interest=...
router.get('/feed', getFeed);

module.exports = router;
