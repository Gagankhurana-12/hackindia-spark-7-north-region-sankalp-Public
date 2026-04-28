const missionService = require('../services/missionService');

exports.getDailyMission = async (req, res) => {
    try {
        const childId = req.child?._id;
        if (!childId) return res.status(401).json({ message: 'Not authorized' });

        const mission = await missionService.getOrGenerateDailyMission(childId);
        res.json({ mission });
    } catch (error) {
        console.error('getDailyMission error:', error);
        res.status(500).json({ message: 'Server error fetching mission' });
    }
};

exports.completeMission = async (req, res) => {
    try {
        const { id } = req.params;
        const mission = await missionService.completeMission(id);
        res.json({ mission });
    } catch (error) {
        console.error('completeMission error:', error);
        res.status(500).json({ message: 'Server error completing mission' });
    }
};
