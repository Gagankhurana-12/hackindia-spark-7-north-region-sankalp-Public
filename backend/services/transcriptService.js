// transcriptService.js — fetches a YouTube transcript (and metadata) for the PPU.
// Returns normalized chunks: [{ text, start, duration }] where start is seconds.
//
// Implementation note: the `youtube-transcript` npm package currently ships a
// brittle HTML regex that crashes with "Cannot read properties of undefined
// (reading 'length')" on YouTube's current watch page markup. We now scrape
// directly: pull the watch page, extract the embedded `ytInitialPlayerResponse`
// JSON (matched by balanced braces, not a regex), pick the best caption track,
// and fetch it in JSON3 / srv1 format from YouTube's own `timedtext` endpoint.
//
// Since late 2025 YouTube's `exp=xpe` experiment causes caption baseUrls fetched
// from outside a real browser session to return 200-empty bodies. When that
// happens we fall through to metadata-only mode: `fetchVideoMetadata` returns
// title / description / duration / keywords from the same player response so
// the PPU can still generate Wow Factors about the topic.

let youtubeTranscriptFetcherPromise = null;

const PLAYER_CACHE = new Map();     // videoId -> { at, player }
const TRANSCRIPT_CACHE = new Map(); // videoId -> { at, chunks }
const TRANSCRIPT_FAIL_CACHE = new Map(); // videoId -> { at, error }
const IN_FLIGHT_TRANSCRIPT = new Map(); // videoId -> Promise<chunks>
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWatchHtml(videoId) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': UA,
            'Accept-Language': 'en-US,en;q=0.9',
            // Skip the EU consent interstitial.
            'Cookie': 'CONSENT=YES+cb; PREF=hl=en',
        },
    });
    if (!res.ok) throw new Error(`watch page HTTP ${res.status}`);
    return res.text();
}

// Extract a top-level JSON object assigned to `ytInitialPlayerResponse` by
// walking balanced braces through the inlined JS. Safer than any regex.
function extractPlayerResponse(html) {
    const markers = ['ytInitialPlayerResponse = ', 'ytInitialPlayerResponse=' ];
    let i = -1;
    for (const m of markers) {
        const k = html.indexOf(m);
        if (k >= 0) { i = k + m.length; break; }
    }
    if (i < 0 || html[i] !== '{') return null;
    let depth = 0, inStr = false, strCh = '', esc = false;
    for (let j = i; j < html.length; j++) {
        const ch = html[j];
        if (inStr) {
            if (esc) { esc = false; continue; }
            if (ch === '\\') { esc = true; continue; }
            if (ch === strCh) inStr = false;
            continue;
        }
        if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue; }
        if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) {
            try { return JSON.parse(html.slice(i, j + 1)); } catch { return null; }
        }
    }
    return null;
}

function pickCaptionTrack(player, preferLang = 'en') {
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    // Prefer manual English, then auto-generated English (kind==='asr'), then first available.
    const manualEn = tracks.find(t => (t.languageCode || '').toLowerCase().startsWith(preferLang) && t.kind !== 'asr');
    const anyEn = tracks.find(t => (t.languageCode || '').toLowerCase().startsWith(preferLang));
    return manualEn || anyEn || tracks[0];
}

const CAPTION_HEADERS = {
    'User-Agent': UA,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': '*/*',
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com',
};

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(label || `timeout ${ms}ms`)), ms)),
    ]);
}

function normalizeLibraryChunks(items) {
    return (Array.isArray(items) ? items : [])
        .map((item) => {
            const rawOffset = Number(item?.offset ?? item?.start ?? 0);
            const rawDuration = Number(item?.duration ?? item?.dur ?? 0);
            const start = rawOffset > 10000 ? rawOffset / 1000 : rawOffset;
            const duration = rawDuration > 10000 ? rawDuration / 1000 : rawDuration;
            const text = String(item?.text || '').replace(/\s+/g, ' ').trim();
            return { text, start, duration };
        })
        .filter((c) => c.text);
}

async function getYoutubeTranscriptFetcher() {
    if (!youtubeTranscriptFetcherPromise) {
        youtubeTranscriptFetcherPromise = (async () => {
            const resolveFromModule = (mod) => {
                if (typeof mod?.fetchTranscript === 'function') return mod.fetchTranscript;
                if (typeof mod?.YoutubeTranscript?.fetchTranscript === 'function') {
                    return mod.YoutubeTranscript.fetchTranscript.bind(mod.YoutubeTranscript);
                }
                return null;
            };

            try {
                const mod = await import('youtube-transcript');
                const fn = resolveFromModule(mod);
                if (fn) return fn;
            } catch {
                // Continue to explicit bundle-path fallback.
            }

            try {
                const mod = await import('youtube-transcript/dist/youtube-transcript.esm.js');
                return resolveFromModule(mod);
            } catch {
                return null;
            }
        })();
    }
    return youtubeTranscriptFetcherPromise;
}

// Strip any existing fmt param (YouTube often returns baseUrl with `fmt=srv3`)
// and append ours so we control the response shape.
function withFormat(baseUrl, fmt) {
    const stripped = baseUrl.replace(/([?&])fmt=[^&]*/g, '$1').replace(/[?&]$/, '').replace(/&&+/g, '&');
    return stripped + (stripped.includes('?') ? '&' : '?') + 'fmt=' + fmt;
}

function parseJson3(data) {
    const events = Array.isArray(data.events) ? data.events : [];
    const chunks = [];
    for (const ev of events) {
        if (!Array.isArray(ev.segs)) continue;
        const text = ev.segs.map(s => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        chunks.push({
            text,
            start: (ev.tStartMs || 0) / 1000,
            duration: (ev.dDurationMs || 0) / 1000,
        });
    }
    return chunks;
}

// XML (srv1) fallback: <transcript><text start="1.23" dur="2.5">...</text>...
function parseXmlSrv1(xml) {
    const chunks = [];
    const re = /<text\s+start="([0-9.]+)"(?:\s+dur="([0-9.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const raw = m[3]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
            .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
            .replace(/\s+/g, ' ').trim();
        if (!raw) continue;
        chunks.push({
            text: raw,
            start: parseFloat(m[1]) || 0,
            duration: parseFloat(m[2] || '0') || 0,
        });
    }
    return chunks;
}

async function fetchCaptionEvents(track) {
    // Try JSON3 first (richer segs); fall back to XML srv1 if the body is empty.
    const jsonUrl = withFormat(track.baseUrl, 'json3');
    let res = await fetch(jsonUrl, { headers: CAPTION_HEADERS });
    if (!res.ok) throw new Error(`caption HTTP ${res.status}`);
    const body = await res.text();
    if (body && body.trim().startsWith('{')) {
        try {
            const chunks = parseJson3(JSON.parse(body));
            if (chunks.length) return chunks;
        } catch { /* fall through to XML */ }
    }

    console.log(`[transcript] json3 empty (${body.length}b) — falling back to srv1 XML`);
    const xmlUrl = withFormat(track.baseUrl, 'srv1');
    res = await fetch(xmlUrl, { headers: CAPTION_HEADERS });
    if (!res.ok) throw new Error(`caption XML HTTP ${res.status}`);
    const xml = await res.text();
    return parseXmlSrv1(xml);
}

// Shared loader: scrape the watch page once and cache the parsed player JSON.
// Both transcript and metadata paths sit on top of this to avoid re-fetching.
const IN_FLIGHT_PLAYER = new Map();

async function loadPlayerResponse(videoId) {
    if (!videoId) throw new Error('videoId is required');
    
    // Check finished executions
    const hit = PLAYER_CACHE.get(videoId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        if (hit.error) throw new Error(hit.error);
        return hit.player;
    }
    
    // Check against concurrent inflight executions to prevent cache stampedes
    if (IN_FLIGHT_PLAYER.has(videoId)) {
        return IN_FLIGHT_PLAYER.get(videoId);
    }

    console.log(`[transcript] ${videoId} MISS player cache — fetching watch page…`);
    
    // Define the async job
    const fetchJob = (async () => {
        try {
            const html = await fetchWatchHtml(videoId);
            const player = extractPlayerResponse(html);
            if (!player) throw new Error('could not parse ytInitialPlayerResponse');

            const status = player.playabilityStatus?.status;
            if (status && status !== 'OK') {
                const errorMsg = player.playabilityStatus?.reason || status;
                PLAYER_CACHE.set(videoId, { at: Date.now(), error: errorMsg });
                throw new Error(errorMsg);
            }
            PLAYER_CACHE.set(videoId, { at: Date.now(), player });
            return player;
        } finally {
            // Once resolved or rejected, remove from inflight map
            IN_FLIGHT_PLAYER.delete(videoId);
        }
    })();
    
    // Track the inflight job
    IN_FLIGHT_PLAYER.set(videoId, fetchJob);
    return fetchJob;
}

exports.fetchTranscript = async (videoId) => {
    if (!videoId) throw new Error('videoId is required');

    const t0 = Date.now();
    const cached = TRANSCRIPT_CACHE.get(videoId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        console.log(`[transcript] ${videoId} HIT cache (${cached.chunks.length} chunks)`);
        return cached.chunks;
    }

    const cachedFail = TRANSCRIPT_FAIL_CACHE.get(videoId);
    if (cachedFail && Date.now() - cachedFail.at < CACHE_TTL_MS) {
        throw new Error(`Transcript unavailable for ${videoId}: ${cachedFail.error}`);
    }

    if (IN_FLIGHT_TRANSCRIPT.has(videoId)) {
        return IN_FLIGHT_TRANSCRIPT.get(videoId);
    }

    const fail = (reason) => {
        TRANSCRIPT_FAIL_CACHE.set(videoId, { at: Date.now(), error: reason });
        console.error(`[transcript] ${videoId} UNAVAILABLE: ${reason}`);
        throw new Error(`Transcript unavailable for ${videoId}: ${reason}`);
    };

    const job = (async () => {
        // Fast path: youtube-transcript library (InnerTube + webpage fallback).
        try {
            const fetcher = await getYoutubeTranscriptFetcher();
            if (typeof fetcher === 'function') {
                // Do not force `en`; let the library pick available regional English like en-CA.
                const libRaw = await withTimeout(fetcher(videoId), 2200, 'library transcript timeout');
                const libChunks = normalizeLibraryChunks(libRaw);
                if (libChunks.length) {
                    TRANSCRIPT_FAIL_CACHE.delete(videoId);
                    TRANSCRIPT_CACHE.set(videoId, { at: Date.now(), chunks: libChunks });
                    console.log(`[transcript] ${videoId} OK via youtube-transcript (${libChunks.length} chunks)`);
                    return libChunks;
                }
                console.warn(`[transcript] ${videoId} youtube-transcript returned empty, falling back to direct scrape`);
            } else {
                console.warn(`[transcript] ${videoId} youtube-transcript unavailable in current runtime, falling back to direct scrape`);
            }
        } catch (e) {
            console.warn(`[transcript] ${videoId} youtube-transcript failed (${e.message}), falling back to direct scrape`);
        }

        let player;
        try { player = await loadPlayerResponse(videoId); }
        catch (e) { return fail(e.message); }

        const track = pickCaptionTrack(player, 'en');
        if (!track) return fail('no caption tracks on this video');
        console.log(`[transcript] ${videoId} captions found (lang=${track.languageCode}${track.kind === 'asr' ? ' auto' : ''})`);

        let chunks;
        try { chunks = await fetchCaptionEvents(track); }
        catch (e) { return fail(`caption fetch failed (${e.message})`); }

        if (chunks.length === 0) return fail('captions parsed but empty (YouTube exp=xpe block)');

        TRANSCRIPT_FAIL_CACHE.delete(videoId);
        TRANSCRIPT_CACHE.set(videoId, { at: Date.now(), chunks });
        const first = chunks[0].start, last = chunks[chunks.length - 1].start;
        console.log(`[transcript] ${videoId} OK ${chunks.length} chunks (${first.toFixed(1)}s → ${last.toFixed(1)}s) in ${Date.now() - t0}ms, cached 30min`);
        return chunks;
    })().finally(() => {
        IN_FLIGHT_TRANSCRIPT.delete(videoId);
    });

    IN_FLIGHT_TRANSCRIPT.set(videoId, job);
    return job;
};

// Metadata-only fallback: returns { title, description, keywords, lengthSeconds,
// channel }. Used by the PPU when transcripts are unavailable (captionless video
// or YouTube bot-detection returning empty caption bodies) so we can still
// generate topic-grounded Wow Factors from the video's own title/description.
exports.fetchVideoMetadata = async (videoId) => {
    const player = await loadPlayerResponse(videoId);
    const vd = player?.videoDetails || {};
    const meta = {
        videoId,
        title: String(vd.title || '').trim(),
        description: String(vd.shortDescription || '').trim(),
        keywords: Array.isArray(vd.keywords) ? vd.keywords.slice(0, 12) : [],
        lengthSeconds: Number(vd.lengthSeconds) || 0,
        channel: String(vd.author || '').trim(),
    };
    console.log(`[transcript] ${videoId} metadata ok: "${meta.title.slice(0, 60)}" (${meta.lengthSeconds}s, channel=${meta.channel})`);
    return meta;
};

// Compact the transcript into a prompt-friendly string with [MM:SS] markers.
// Trims to a word budget so we stay inside fast LLM context windows.
exports.toPromptText = (chunks, { maxWords = 1800 } = {}) => {
    const fmt = s => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };
    let words = 0;
    const parts = [];
    for (const c of chunks) {
        const w = c.text.split(' ').length;
        if (words + w > maxWords) break;
        parts.push(`[${fmt(c.start)}] ${c.text}`);
        words += w;
    }
    return parts.join('\n');
};

// Pick two transcript chunks at rough narrative beats (≈25% and ≈65%).
// Used by the heuristic fallback when an LLM key is unavailable.
exports.pickBeats = (chunks) => {
    if (!chunks.length) return [];
    const pickAt = ratio => {
        const lastStart = chunks[chunks.length - 1].start || 1;
        const target = lastStart * ratio;
        let best = chunks[0];
        let bestDiff = Infinity;
        for (const c of chunks) {
            const d = Math.abs(c.start - target);
            if (d < bestDiff && c.text.length > 25) { best = c; bestDiff = d; }
        }
        return best;
    };
    const a = pickAt(0.25);
    const b = pickAt(0.65);
    return a.start === b.start ? [a] : [a, b];
};
