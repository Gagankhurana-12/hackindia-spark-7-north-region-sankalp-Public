const express = require('express');
const { completeTask } = require('../controllers/taskController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', protectParent, completeTask);

module.exports = router;
