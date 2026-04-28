/**
 * recommendationIntegration.js
 * Frontend integration example for the recommendation & learning algorithm
 * 
 * Usage:
 * - Import this file in your VideoPlayer.jsx or Watch.jsx
 * - Call functions when appropriate (video load, pause, end, etc.)
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
/**
 * Get the child's personalized video feed
 * @param {string} childToken - JWT token for the child
 * @param {number} age - Child's age
 * @param {string} interest - Optional specific interest to filter by
 * @returns {Promise<Object>} Feed with personalized videos
 */
export async function getPersonalizedFeed(childToken, age = 10, interest = null) {
  const params = new URLSearchParams({ age });
  if (interest) params.append('interest', interest);
  
  const response = await fetch(`${API_BASE}/api/ppu/feed?${params}`, {
    headers: {
      'Authorization': `Bearer ${childToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch feed');
  return response.json();
}

/**
 * Get resume information for a video
 * @param {string} childToken - JWT token for the child
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Resume info with resumeTime and completion
 */
export async function getResumeInfo(childToken, videoId) {
  const response = await fetch(`${API_BASE}/api/watch/resume/${videoId}`, {
    headers: {
      'Authorization': `Bearer ${childToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch resume info');
  return response.json();
}

/**
 * Track video watch progress
 * Call this when pausing, at intervals, or when video ends
 * @param {string} childToken - JWT token for the child
 * @param {string} videoId - YouTube video ID
 * @param {number} completion - Percentage watched (0-100)
 * @param {number} currentTime - Current timestamp in seconds
 * @param {string} videoTopic - Optional topic of the video
 * @returns {Promise<Object>} Track response
 */
export async function trackVideoProgress(
  childToken, 
  videoId, 
  completion, 
  currentTime, 
  videoTopic = null
) {
  const body = {
    videoId,
    completion: Math.min(100, Math.max(0, completion)),
    lastWatchedTime: Math.floor(currentTime),
  };
  
  if (videoTopic) body.videoTopic = videoTopic;
  
  const response = await fetch(`${API_BASE}/api/watch/track`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${childToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) throw new Error('Failed to track video progress');
  return response.json();
}

/**
 * Get the next recommended video based on learning path
 * @param {string} childToken - JWT token for the child
 * @param {string} currentVideoId - Current video's ID
 * @param {Array} allVideos - Array of all available videos
 * @returns {Promise<Object>} Recommendation with nextRecommendation video
 */
export async function getNextRecommendation(childToken, currentVideoId, allVideos) {
  const response = await fetch(`${API_BASE}/api/watch/next-recommendation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${childToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currentVideoId,
      allVideos
    })
  });
  
  if (!response.ok) throw new Error('Failed to get next recommendation');
  return response.json();
}

/**
 * Get child's full watch history
 * @param {string} childToken - JWT token for the child
 * @param {number} limit - Max number of entries (default 20)
 * @returns {Promise<Object>} Watch history with count and entries
 */
export async function getWatchHistory(childToken, limit = 20) {
  const response = await fetch(`${API_BASE}/api/watch/history?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${childToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch watch history');
  return response.json();
}

/**
 * Setup video player with recommendation features
 * This is an example of how to integrate everything together
 * 
 * Usage in VideoPlayer.jsx:
 * ```
 * useEffect(() => {
 *   setupVideoPlayer(videoPlayerId, childToken, videoId, videoTopic, feedVideos);
 * }, [videoId, childToken]);
 * ```
 */
export async function setupVideoPlayer(
  videoElement,
  childToken,
  videoId,
  videoTopic,
  allVideos
) {
  try {
    // 1. Get resume info and resume from last watched timestamp
    const resumeInfo = await getResumeInfo(childToken, videoId);
    if (resumeInfo.status === 'watched' && resumeInfo.resumeTime > 0) {
      videoElement.currentTime = resumeInfo.resumeTime;
      console.log(`Resumed from ${resumeInfo.resumeTime}s`);
    }

    // 2. Track progress every 10 seconds
    const progressInterval = setInterval(async () => {
      const percentage = (videoElement.currentTime / videoElement.duration) * 100;
      await trackVideoProgress(
        childToken, 
        videoId, 
        percentage, 
        videoElement.currentTime,
        videoTopic
      ).catch(err => console.warn('Track failed:', err));
    }, 10000);

    // 3. On video end
    videoElement.addEventListener('ended', async () => {
      clearInterval(progressInterval);
      
      // Track as completed
      await trackVideoProgress(
        childToken,
        videoId,
        100,
        videoElement.duration,
        videoTopic
      );

      // Get next recommendation
      const nextRec = await getNextRecommendation(childToken, videoId, allVideos);
      if (nextRec.nextRecommendation) {
        console.log('Next recommended:', nextRec.nextRecommendation.title);
        // Show "Up Next" suggestion in UI
        showNextVideoSuggestion(nextRec.nextRecommendation);
      }
    });

    // 4. Track on unload/page close
    window.addEventListener('beforeunload', async () => {
      clearInterval(progressInterval);
      const percentage = (videoElement.currentTime / videoElement.duration) * 100;
      await trackVideoProgress(
        childToken,
        videoId,
        percentage,
        videoElement.currentTime,
        videoTopic
      ).catch(err => console.warn('Final track failed:', err));
    });

  } catch (error) {
    console.error('Error setting up video player:', error);
  }
}

/**
 * Load and display personalized video feed
 * Usage in VideoFeed.jsx:
 * ```
 * useEffect(() => {
 *   loadPersonalizedFeed(childToken, childAge);
 * }, [childToken]);
 * ```
 */
export async function loadPersonalizedFeed(childToken, age) {
  try {
    const feed = await getPersonalizedFeed(childToken, age);
    console.log(`Feed personalization method: ${feed.personalizationMethod}`);
    console.log(`Videos: ${feed.videos.length}`);
    return feed.videos;
  } catch (error) {
    console.error('Error loading personalized feed:', error);
    throw error;
  }
}

// Helper UI function (implement based on your UI library)
function showNextVideoSuggestion(nextVideo) {
  // Show a modal, toast, card, etc. suggesting the next video
  // Example using native alert (replace with your UI):
  if (window.confirm(`Watch next: "${nextVideo.title}"?`)) {
    // Navigate to next video
    window.location.href = `/watch/${nextVideo.id}`;
  }
}

export default {
  getPersonalizedFeed,
  getResumeInfo,
  trackVideoProgress,
  getNextRecommendation,
  getWatchHistory,
  setupVideoPlayer,
  loadPersonalizedFeed
};
