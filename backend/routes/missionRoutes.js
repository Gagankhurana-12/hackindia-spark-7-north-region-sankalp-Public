const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');
const { protectChild } = require('../middlewares/authMiddleware'); // I'll check if this exists

router.get('/daily', protectChild, missionController.getDailyMission);
router.post('/complete/:id', protectChild, missionController.completeMission);

module.exports = router;
