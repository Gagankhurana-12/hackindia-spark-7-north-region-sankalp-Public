const express = require('express');
const {
    listTasks,
    createTask,
    completeTask,
    skipTask,
    deleteTask,
} = require('../controllers/taskController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protectParent, listTasks);
router.post('/', protectParent, createTask);
router.patch('/:id/complete', protectParent, completeTask);
router.patch('/:id/skip', protectParent, skipTask);
router.delete('/:id', protectParent, deleteTask);

module.exports = router;
