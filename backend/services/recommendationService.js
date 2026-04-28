// recommendationService.js
// Service to generate personalized video recommendations for children

const WatchHistory = require('../models/WatchHistory');
const Child = require('../models/Child');

/**
 * Personalize and rank video feed based on child's watch history
 * @param {String} childId - The child's ObjectId
 * @param {Array} allVideos - Array of video objects from SmartFetcher { id, title, topic, ... }
 * @param {Number} maxResults - Maximum videos to return
 * @returns {Array} - Ranked and filtered video objects
 */
async function personalizeVideoFeed(childId, allVideos, maxResults = 24) {
  // Fetch child profile
  const child = await Child.findById(childId).select('interests').lean();
  if (!child) throw new Error('Child not found');

  // Fetch watch history
  const history = await WatchHistory.find({ childId }).select('videoId').lean();
  const watchedVideoIds = new Set(history.map(h => h.videoId));

  // Get recent topics from watch history (last 10 videos)
  const recentWatchHistory = await WatchHistory.find({ childId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('videoId')
    .lean();
  
  const recentVideoIds = new Set(recentWatchHistory.map(h => h.videoId));

  // Step 1: Exclude already watched videos
  let available = allVideos.filter(v => !watchedVideoIds.has(v.id));

  // Step 2: Extract recent topic keywords from recently watched videos
  const recentTopicKeywords = new Set();
  allVideos.forEach(v => {
    if (recentVideoIds.has(v.id) && v.topic) {
      recentTopicKeywords.add(v.topic.toLowerCase());
    }
  });

  // Step 3: Categorize videos into familiar and new
  const familiar = available.filter(v => 
    recentTopicKeywords.has(v.topic?.toLowerCase()) || 
    child.interests.some(interest => v.title?.toLowerCase().includes(interest.toLowerCase()))
  );

  const newTopics = available.filter(v => !familiar.includes(v));

  // Step 4: Mix 70% familiar + 30% new (with randomization)
  const nFamiliar = Math.floor(maxResults * 0.7);
  const nNew = maxResults - nFamiliar;

  const shuffleArray = (arr) => arr.sort(() => 0.5 - Math.random());
  const selectedFamiliar = shuffleArray([...familiar]).slice(0, Math.min(nFamiliar, familiar.length));
  const selectedNew = shuffleArray([...newTopics]).slice(0, Math.min(nNew, newTopics.length));

  // Step 5: Combine and return
  const feed = [...selectedFamiliar, ...selectedNew].slice(0, maxResults);

  return feed;
}

module.exports = { personalizeVideoFeed };
