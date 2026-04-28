const mongoose = require('mongoose');
const ActivityTask = require('../models/ActivityTask');
const Child = require('../models/Child');

const ensureChildOwned = async (childId, parentId) => {
    if (!mongoose.Types.ObjectId.isValid(childId)) return null;
    return Child.findOne({ _id: childId, parentId }).lean();
};

exports.listTasks = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId } = req.query;
        if (!childId) return res.status(400).json({ message: 'childId is required' });

        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        const tasks = await ActivityTask.find({ childId, parentId })
            .sort({ assignedAt: -1 })
            .lean();
        res.json({ tasks });
    } catch (error) {
        console.error('listTasks error:', error);
        res.status(500).json({ message: 'Server error listing tasks' });
    }
};

exports.createTask = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId, title, description, rewardMinutes } = req.body;
        if (!childId || !title?.trim()) {
            return res.status(400).json({ message: 'childId and title are required' });
        }

        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        const reward = Math.max(0, Math.min(180, Number(rewardMinutes) || 10));

        const task = await ActivityTask.create({
            childId,
            parentId,
            title: title.trim(),
            description: (description || '').trim(),
            rewardMinutes: reward,
            status: 'pending',
            assignedAt: new Date(),
        });

        res.status(201).json({ task });
    } catch (error) {
        console.error('createTask error:', error);
        res.status(500).json({ message: 'Server error creating task' });
    }
};

const updateStatus = async (req, res, nextStatus) => {
    const parentId = req.parent?._id;
    if (!parentId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await ActivityTask.findOne({ _id: id, parentId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.status === nextStatus) return res.json({ task });

    task.status = nextStatus;
    task.completedAt = nextStatus === 'completed' ? new Date() : null;
    await task.save();
    res.json({ task });
};

exports.completeTask = (req, res) =>
    updateStatus(req, res, 'completed').catch((err) => {
        console.error('completeTask error:', err);
        res.status(500).json({ message: 'Server error completing task' });
    });

exports.skipTask = (req, res) =>
    updateStatus(req, res, 'skipped').catch((err) => {
        console.error('skipTask error:', err);
        res.status(500).json({ message: 'Server error skipping task' });
    });

exports.deleteTask = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid task id' });
        }

        const result = await ActivityTask.deleteOne({ _id: id, parentId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('deleteTask error:', error);
        res.status(500).json({ message: 'Server error deleting task' });
    }
};
