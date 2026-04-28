// SmartFetcher.mjs — GrowthFeed "Smart-Brain" fetcher.
// Builds high-intent YouTube queries, fetches pillars in parallel,
// and returns a UI-ready payload under the 2-second budget.

import https from 'https';

import { AGE_BANDS, DISCOVERY_PILLARS, JUNK_REGEX } from './config/matrix.mjs';

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const FEED_MAX_PILLARS = Math.max(1, Number(process.env.FEED_MAX_PILLARS) || 4);

// ---------------------------------------------------------------- helpers

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getAgeBand(age) {
  for (const [key, band] of Object.entries(AGE_BANDS)) {
    const [lo, hi] = band.range;
    if (age >= lo && age <= hi) return key;
  }
  return null;
}

// Parse ISO-8601 duration (PT#H#M#S) -> "mm:ss" and short/normal format tag.
function parseDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '') || [];
  const h = +(m[1] || 0), mm = +(m[2] || 0), s = +(m[3] || 0);
  const total = h * 3600 + mm * 60 + s;
  const pad = n => String(n).padStart(2, '0');
  const display = h ? `${h}:${pad(mm)}:${pad(s)}` : `${mm}:${pad(s)}`;
  return { total, display, format: total > 0 && total <= 60 ? 'short' : 'normal' };
}

// ------------------------------------------------------ the "Smart Brain"

/**
 * createQuery — the core linguistic engineering function.
 * Assembles: <interest lexicon> + <age-band visual hooks>.
 */
export function createQuery(age, interest, pillar) {
  const bandKey = getAgeBand(age);
  if (!bandKey) throw new Error(`Unsupported age: ${age}`);
  const band = AGE_BANDS[bandKey];

  const key = interest || pillar;
  const lexicon = (band.pillars[key] && band.pillars[key].length)
    ? pickRandom(band.pillars[key])
    : key;

  const hook = pickRandom(band.hooks);
  return { q: `${lexicon} ${hook}`.trim(), bandKey };
}

// -------------------------------------------------------- network layer

async function httpJson(url, params) {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${qs}`;

  return new Promise((resolve, reject) => {
    // For development: disable cert validation against trusted APIs
    const opts = { timeout: 10000, rejectUnauthorized: false };

    https.get(fullUrl, opts, async (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            const err = JSON.parse(body);
            throw new Error(`YouTube API ${res.statusCode}: ${err.error?.message || body}`);
          }
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.error('[httpJson] https error:', err.message);
      reject(new Error(`Network error: ${err.message}`));
    });
  });
}

async function searchPillar({ apiKey, q, pageToken, maxResults }) {
  const baseParams = {
    key: apiKey,
    part: 'snippet',
    q,
    type: 'video',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    maxResults,
    ...(pageToken ? { pageToken } : {}),
  };

  // Prefer closed-captioned videos for downstream transcript reliability.
  let data = await httpJson(SEARCH_URL, {
    ...baseParams,
    videoCaption: 'closedCaption',
  });

  if (!Array.isArray(data.items) || data.items.length === 0) {
    data = await httpJson(SEARCH_URL, baseParams);
  }

  return {
    ids: (data.items || []).map(i => i.id.videoId).filter(Boolean),
    snippets: Object.fromEntries((data.items || []).map(i => [i.id.videoId, i.snippet])),
    nextPageToken: data.nextPageToken || null,
  };
}

async function hydrateVideos({ apiKey, ids }) {
  if (!ids.length) return [];
  const data = await httpJson(VIDEOS_URL, {
    key: apiKey,
    part: 'contentDetails,snippet',
    id: ids.join(','),
  });
  return data.items || [];
}

// -------------------------------------------------- filters & formatting

function isJunk(snippet = {}) {
  const blob = `${snippet.title || ''} ${snippet.description || ''}`;
  return JUNK_REGEX.test(blob);
}

function formatVideos(items, pillarLabel) {
  return items
    .filter(it => !isJunk(it.snippet))
    .map(it => {
      const d = parseDuration(it.contentDetails && it.contentDetails.duration);
      const sn = it.snippet || {};
      return {
        id: it.id,
        format: d.format,
        context: `Concept: ${pillarLabel}`,
        display: {
          title: sn.title,
          thumbnail: (sn.thumbnails && (sn.thumbnails.high || sn.thumbnails.medium || sn.thumbnails.default) || {}).url,
          duration: d.display,
        },
      };
    });
}


// ------------------------------------------------------- public entrypoint

export async function fetchFeed({
  age,
  interest = null,
  interests = [],
  personalized = false,
  pageToken = null,
  maxResults = 24,
  apiKey = process.env.YOUTUBE_API_KEY,
} = {}) {
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is missing');
  const started = Date.now();

  const bandKey = getAgeBand(age);
  if (!bandKey) throw new Error(`Unsupported age: ${age}`);

  const normalizedInterests = [...new Set((Array.isArray(interests) ? interests : [])
    .map(v => String(v || '').trim())
    .filter(Boolean))];

  // Decide pillars: explicit category > child interests > default discovery pillars.
  const rawPillars = interest
    ? [interest]
    : normalizedInterests.length
      ? normalizedInterests
      : DISCOVERY_PILLARS;

  // Use pillars based on child interests; cap by FEED_MAX_PILLARS for quota safety.
  const pillars = interest ? rawPillars : rawPillars.slice(0, Math.min(FEED_MAX_PILLARS, rawPillars.length));

  // Over-fetch factor (1.5x) to ensure we have enough after junk filters.
  const perPillar = interest ? Math.floor(maxResults * 1.5) : Math.max(5, Math.ceil((maxResults / pillars.length) * 1.5));

  console.log('[fetchFeed]', { age, bandKey, interest, interests: normalizedInterests, personalized, pillars, perPillar });

  // 1. Parallel Search across pillars
  const pillarResults = await Promise.all(pillars.map(async pillar => {
    try {
      const { q } = createQuery(age, interest, pillar);
      const search = await searchPillar({ apiKey, q, pageToken, maxResults: perPillar });
      return { pillar, ...search };
    } catch (err) {
      console.error('[pillar search error]', pillar, err.message);
      return { pillar, ids: [], snippets: {} };
    }
  }));

  // 2. Batch Hydration (saves 3-4 round trips)
  const allIds = [...new Set(pillarResults.flatMap(r => r.ids))];
  const hydratedVideos = await hydrateVideos({ apiKey, ids: allIds });
  const videoMap = new Map(hydratedVideos.map(v => [v.id, v]));

  // 3. Format and Interleave (Ensures variety: Science 1, Math 1, Science 2, Math 2...)
  const dedup = new Map();
  const shards = pillarResults.map(res => {
    const pillarVideos = res.ids.map(id => videoMap.get(id)).filter(Boolean);
    return {
      pillar: res.pillar,
      videos: formatVideos(pillarVideos, res.pillar)
    };
  });

  const maxPillarLen = Math.max(...shards.map(s => s.videos.length), 0);

  for (let i = 0; i < maxPillarLen; i++) {
    for (const shard of shards) {
      const v = shard.videos[i];
      if (v && !dedup.has(v.id)) {
        dedup.set(v.id, v);
      }
      if (dedup.size >= maxResults) break;
    }
    if (dedup.size >= maxResults) break;
  }

  const videos = Array.from(dedup.values());
  const pillarLabel = interest ? interest : pillars.join(' / ');
  const nextPageToken = pillarResults.find(r => r.nextPageToken)?.nextPageToken || null;

  return {
    status: 'success',
    latency: `${Date.now() - started}ms`,
    meta: {
      ageGroup: bandKey,
      pillar: pillarLabel,
      personalized,
      interestsUsed: pillars,
      shards: shards.map(s => ({ name: s.pillar, count: s.videos.length }))
    },
    nextPageToken,
    videos,
  };
}

export default { fetchFeed, createQuery, getAgeBand };
