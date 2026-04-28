const express = require('express');
const { getChildren } = require('../controllers/parentController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/parent/children
router.get('/children', protectParent, getChildren);

module.exports = router;
