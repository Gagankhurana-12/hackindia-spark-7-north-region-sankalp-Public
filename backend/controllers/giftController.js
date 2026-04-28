const ChildGift = require('../models/ChildGift');
const Child = require('../models/Child');

async function searchYouTube(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;
    try {
        // Enforce educational/learning filters and exclude music/shorts
        const refinedQuery = `${query} educational informative -music -short -lyrics -vevo -official video`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedQuery)}&type=video&maxResults=1&relevanceLanguage=en&videoDuration=medium&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const item = data.items?.[0];
        if (!item) return null;
        return {
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
        };
    } catch (err) {
        console.warn('[searchYouTube] catch:', err.message);
        return null;
    }
}

exports.unboxGift = async (req, res) => {
    try {
        const childId = req.child?._id;
        if (!childId) return res.status(401).json({ message: 'Child authentication required' });

        const { videoId, videoTitle, fact, relatableThing, giftType, bridgeSearchQuery } = req.body;

        if (!videoId || !fact || !relatableThing || !giftType) {
            return res.status(400).json({ message: 'Missing gift details' });
        }

        // Check if already unboxed
        const existing = await ChildGift.findOne({ childId, videoId, fact });
        if (existing) {
            return res.json({ message: 'Gift already unboxed', gift: existing });
        }

        let unlockedVideo = null;
        if (bridgeSearchQuery) {
            unlockedVideo = await searchYouTube(bridgeSearchQuery);
        }

        const gift = await ChildGift.create({
            childId,
            videoId,
            videoTitle: videoTitle || 'A cool video',
            fact,
            relatableThing,
            giftType: unlockedVideo ? 'video' : giftType,
            unlockedVideoId: unlockedVideo?.videoId,
            unlockedVideoTitle: unlockedVideo?.title,
            unlockedVideoThumbnail: unlockedVideo?.thumbnail
        });

        // Provide some XP for finding a gift
        await Child.findByIdAndUpdate(childId, { $inc: { xp: 50 } });

        return res.status(201).json({ message: 'Gift unboxed!', gift });
    } catch (error) {
        console.error('[unboxGift]', error);
        return res.status(500).json({ message: 'Failed to unbox gift' });
    }
};

exports.getChildGifts = async (req, res) => {
    try {
        const childId = req.child?._id;
        if (!childId) return res.status(401).json({ message: 'Child authentication required' });

        const gifts = await ChildGift.find({ childId }).sort({ unboxedAt: -1 }).limit(10).lean();
        return res.json({ gifts });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch gifts' });
    }
};
