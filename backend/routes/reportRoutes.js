const express = require('express');
const { getReports } = require('../controllers/reportController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protectParent, getReports);

module.exports = router;
