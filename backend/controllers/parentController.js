const Child = require('../models/Child');

const FALLBACK_PALETTE = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

const deriveColor = (seed) => {
    const str = String(seed || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
    return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
};

exports.getChildren = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const children = await Child.find({ parentId })
            .select('_id name age avatarColor linkCode interests language')
            .lean();

        const payload = children.map((c) => ({
            _id: c._id,
            name: c.name,
            age: c.age,
            avatarColor: c.avatarColor || deriveColor(c._id),
            linkCode: c.linkCode,
            interests: c.interests || [],
            language: c.language || 'english',
        }));

        res.json({ children: payload });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error retrieving children' });
    }
};
