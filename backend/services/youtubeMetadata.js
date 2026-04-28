const dotenv = require('dotenv');
const WatchHistory = require('../models/WatchHistory');

dotenv.config();

const YOUTUBE_VIDEOS_API = 'https://www.googleapis.com/youtube/v3/videos';

function isMeaningful(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower !== 'growthfeed video' && lower !== 'education' && !lower.startsWith('video:');
}

function normalizeDuration(isoDuration) {
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoDuration || '');
    if (!match) return '';
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const pad = (value) => String(value).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${minutes}:${pad(seconds)}`;
}

function ytThumbFromId(id) {
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

// Hydrate watch-history-like rows ({_id?, videoId, videoTitle, videoThumbnail, videoChannel, videoDuration})
// with metadata from the YouTube Data API. If the API key is missing we still
// fall back to canonical YouTube thumbnails so the UI never shows blank tiles.
async function hydrateWatchHistory(history) {
    if (!Array.isArray(history) || history.length === 0) return history;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return history.map((item) => ({
            ...item,
            videoThumbnail: item.videoThumbnail && !String(item.videoThumbnail).includes('unsplash.com')
                ? item.videoThumbnail
                : ytThumbFromId(item.videoId),
        }));
    }

    const uniqueIds = [...new Set(history.map((item) => item.videoId).filter(Boolean))].slice(0, 50);
    if (uniqueIds.length === 0) return history;

    try {
        const params = new URLSearchParams({
            part: 'snippet,contentDetails',
            id: uniqueIds.join(','),
            key: apiKey,
            maxResults: '50',
        });
        const response = await fetch(`${YOUTUBE_VIDEOS_API}?${params.toString()}`);
        if (!response.ok) {
            return history.map((item) => ({
                ...item,
                videoThumbnail: item.videoThumbnail && !String(item.videoThumbnail).includes('unsplash.com')
                    ? item.videoThumbnail
                    : ytThumbFromId(item.videoId),
            }));
        }

        const payload = await response.json();
        const lookup = new Map((payload.items || []).map((item) => [item.id, item]));

        const enriched = history.map((item) => {
            const meta = lookup.get(item.videoId);
            const fallbackThumb = ytThumbFromId(item.videoId);
            if (!meta) {
                return {
                    ...item,
                    videoThumbnail: item.videoThumbnail && !String(item.videoThumbnail).includes('unsplash.com')
                        ? item.videoThumbnail
                        : fallbackThumb,
                };
            }
            const snippet = meta.snippet || {};
            const duration = normalizeDuration(meta.contentDetails?.duration);
            const useApiTitle = !isMeaningful(item.videoTitle);
            const useApiChannel = !isMeaningful(item.videoChannel);
            const useApiThumbnail = !item.videoThumbnail || String(item.videoThumbnail).includes('unsplash.com');
            const useApiDuration = !item.videoDuration;
            return {
                ...item,
                videoTitle: useApiTitle ? (snippet.title || item.videoTitle || '') : item.videoTitle,
                videoThumbnail: useApiThumbnail
                    ? (snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || fallbackThumb)
                    : item.videoThumbnail,
                videoChannel: useApiChannel ? (snippet.channelTitle || item.videoChannel || '') : item.videoChannel,
                videoDuration: useApiDuration ? (duration || item.videoDuration || '') : item.videoDuration,
            };
        });

        const bulkOps = enriched
            .filter((item) => item._id && (item.videoTitle || item.videoThumbnail || item.videoChannel || item.videoDuration))
            .map((item) => ({
                updateOne: {
                    filter: { _id: item._id },
                    update: {
                        $set: {
                            ...(item.videoTitle ? { videoTitle: item.videoTitle } : {}),
                            ...(item.videoThumbnail ? { videoThumbnail: item.videoThumbnail } : {}),
                            ...(item.videoChannel ? { videoChannel: item.videoChannel } : {}),
                            ...(item.videoDuration ? { videoDuration: item.videoDuration } : {}),
                        },
                    },
                },
            }));

        if (bulkOps.length > 0) {
            WatchHistory.bulkWrite(bulkOps, { ordered: false }).catch(() => {});
        }

        return enriched;
    } catch (error) {
        console.warn('[youtubeMetadata] hydrate failed:', error.message);
        return history.map((item) => ({
            ...item,
            videoThumbnail: item.videoThumbnail && !String(item.videoThumbnail).includes('unsplash.com')
                ? item.videoThumbnail
                : ytThumbFromId(item.videoId),
        }));
    }
}

module.exports = {
    hydrateWatchHistory,
    isMeaningful,
    normalizeDuration,
    ytThumbFromId,
};
