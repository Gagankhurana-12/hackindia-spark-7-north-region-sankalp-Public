const express = require('express');
const { getOverview } = require('../controllers/dashboardController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/dashboard/overview?childId=:id
router.get('/overview', protectParent, getOverview);

module.exports = router;
