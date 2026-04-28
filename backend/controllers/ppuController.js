// ppuController.js — Parallel Processing Unit entrypoint.
// Orchestrates Thread B of the PPU: transcript -> Groq-backed Wow Factors.
// Caches results per (videoId, age-band) so repeat opens are instant.

const { fetchTranscript } = require('../services/transcriptService');
const { fetchVideoMetadata } = require('../services/transcriptService');
const { generateWowFactors, generateWowFactorsFromMetadata } = require('../services/groqService');
const { personalizeVideoFeed } = require('../services/recommendationService');
const jwt = require('jsonwebtoken');
const Child = require('../models/Child');

const WOW_CACHE = new Map(); // key -> { at, payload }
const IN_FLIGHT_WOW_FACTORS = new Map(); // key -> Promise
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const TRANSCRIPT_TIMEOUT_MS = 6500;
const AI_TIMEOUT_MS = 15000;
const FEED_CACHE = new Map(); // key -> { at, payload }
const IN_FLIGHT_FEED = new Map(); // key -> Promise
const FEED_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

function withTimeoutStatus(promise, ms) {
    return Promise.race([
        promise.then((value) => ({ timedOut: false, value })).catch((error) => ({ timedOut: false, error })),
        new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), ms)),
    ]);
}

function bandKeyOf(age) {
    const a = Number(age) || 10;
    if (a <= 5) return 'sensory';
    if (a <= 12) return 'functional';
    return 'specialist';
}

function cacheKey({ videoId, age, interest }) {
    return `${videoId}|${bandKeyOf(age)}|${interest || ''}`;
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(label || `timeout ${ms}ms`)), ms)),
    ]);
}

function parseBearerToken(req) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    return header.slice(7).trim() || null;
}

function normalizeInterests(value) {
    const list = Array.isArray(value) ? value : [];
    return [...new Set(list
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .map((x) => x.toLowerCase()))];
}

exports.getWowFactors = async (req, res) => {
    const started = Date.now();
    try {
        const videoId = String(req.query.videoId || '').trim();
        const age = Number(req.query.age) || 10;
        const interest = req.query.interest ? String(req.query.interest) : null;

        if (!videoId) {
            return res.status(400).json({ message: 'videoId is required' });
        }

        console.log(`\n[ppu] ▶ GET /wow-factors videoId=${videoId} age=${age} band=${bandKeyOf(age)}${interest ? ` interest=${interest}` : ''}`);

        const key = cacheKey({ videoId, age, interest });
        const cached = WOW_CACHE.get(key);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
            console.log(`[ppu]   HIT wow-cache (${cached.payload.wowFactors.length} factors, age=${Math.round((Date.now() - cached.at) / 1000)}s)`);
            return res.json({
                ...cached.payload,
                cached: true,
                latencyMs: Date.now() - started,
            });
        }
        console.log(`[ppu]   MISS wow-cache → running pipeline`);

        // Force check duration
        const metadata = await fetchVideoMetadata(videoId).catch(() => null);
        if (metadata && metadata.lengthSeconds < 60) {
            console.log(`[ppu]   SKIP: video too short (${metadata.lengthSeconds}s)`);
            return res.json({
                videoId,
                ageBand: bandKeyOf(age),
                wowFactors: [],
                source: 'skip-too-short',
                transcriptStatus: 'cancel',
                aiStatus: 'cancelled',
                latencyMs: Date.now() - started
            });
        }

        let inFlight = IN_FLIGHT_WOW_FACTORS.get(key);
        if (!inFlight) {
            inFlight = (async () => {
                // Transcript-only mode: if captions/transcript are unavailable, return error.
                let chunks = [];
                try {
                    chunks = await withTimeout(fetchTranscript(videoId), TRANSCRIPT_TIMEOUT_MS, 'transcript timeout');
                } catch (e) {
                    try {
                        const metadata = await fetchVideoMetadata(videoId);
                        const result = await generateWowFactorsFromMetadata({
                            metadata,
                            age,
                            interest,
                        });

                        const payload = {
                            videoId,
                            ageBand: bandKeyOf(age),
                            wowFactors: result.wowFactors,
                            source: result.source,
                            inputSource: 'metadata',
                            transcriptStatus: 'cancel',
                            aiStatus: 'tick',
                            transcriptMessage: e.message,
                        };

                        WOW_CACHE.set(key, { at: Date.now(), payload });
                        return payload;
                    } catch (metadataError) {
                        const err = new Error(metadataError.message || e.message);
                        err.status = 422;
                        err.payload = {
                            message: 'Transcript unavailable',
                            error: e.message,
                            source: 'transcript-error',
                            wowFactors: [],
                        };
                        throw err;
                    }
                }

                if (!Array.isArray(chunks) || chunks.length === 0) {
                    const err = new Error('Transcript is empty for this video');
                    err.status = 422;
                    err.payload = {
                        message: 'Transcript unavailable',
                        error: 'Transcript is empty for this video',
                        source: 'transcript-empty',
                        wowFactors: [],
                    };
                    throw err;
                }

                let result;
                const aiOutcome = await withTimeoutStatus(generateWowFactors({ chunks, age, interest }), AI_TIMEOUT_MS);
                if (aiOutcome.timedOut) {
                    return {
                        videoId,
                        ageBand: bandKeyOf(age),
                        wowFactors: [],
                        source: 'ai-cancelled',
                        inputSource: 'transcript',
                        transcriptStatus: 'tick',
                        aiStatus: 'cancelled',
                        aiMessage: 'AI generation cancelled before completion',
                    };
                }
                if (aiOutcome.error) {
                    const err = new Error(aiOutcome.error.message);
                    err.status = 422;
                    err.payload = {
                        message: 'Transcript processing failed',
                        error: aiOutcome.error.message,
                        source: 'transcript-ai-error',
                        wowFactors: [],
                        transcriptStatus: 'tick',
                        aiStatus: 'cancelled',
                    };
                    throw err;
                }
                result = aiOutcome.value;

                if (!Array.isArray(result?.wowFactors) || result.wowFactors.length === 0) {
                    const err = new Error('Transcript was found but no moments could be generated');
                    err.status = 422;
                    err.payload = {
                        message: 'No wow factors generated from transcript',
                        error: 'Transcript was found but no moments could be generated',
                        source: 'transcript-no-moments',
                        wowFactors: [],
                        transcriptStatus: 'tick',
                        aiStatus: 'cancelled',
                    };
                    throw err;
                }

                const payload = {
                    videoId,
                    ageBand: bandKeyOf(age),
                    wowFactors: result.wowFactors,
                    source: result.source,
                    inputSource: 'transcript',
                    transcriptStatus: 'tick',
                    aiStatus: 'tick',
                };

                WOW_CACHE.set(key, { at: Date.now(), payload });
                return payload;
            })().finally(() => {
                IN_FLIGHT_WOW_FACTORS.delete(key);
            });
            IN_FLIGHT_WOW_FACTORS.set(key, inFlight);
        } else {
            console.log('[ppu]   JOIN in-flight request');
        }

        try {
            const payload = await inFlight;
            const totalMs = Date.now() - started;
            console.log(`[ppu] ✔ done in ${totalMs}ms (source=${payload.source}, factors=${payload.wowFactors.length}, cached 12h)`);

            return res.json({
                ...payload,
                cached: false,
                latencyMs: totalMs,
            });
        } catch (e) {
            console.warn(`[ppu]   ✖ transcript unavailable (${e.message})`);
            if (e && e.status && e.payload) {
                return res.json({
                    ...e.payload,
                    transcriptStatus: e.payload.transcriptStatus || 'cancel',
                    aiStatus: e.payload.aiStatus || 'cancelled',
                    cached: false,
                    latencyMs: Date.now() - started,
                });
            }
            return res.json({
                message: 'Transcript unavailable',
                error: e.message,
                source: 'transcript-error',
                wowFactors: [],
                transcriptStatus: 'cancel',
                aiStatus: 'cancelled',
                cached: false,
                latencyMs: Date.now() - started,
            });
        }
    } catch (error) {
        console.error('[ppu] ✖ unhandled error:', error);
        return res.status(500).json({
            message: 'PPU failure',
            error: error.message,
            source: 'ppu-error',
            wowFactors: [],
        });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const requestedInterest = req.query.interest && req.query.interest !== 'all'
            ? String(req.query.interest).trim().toLowerCase()
            : null;
        const pageToken = req.query.pageToken ? String(req.query.pageToken) : null;
        const requestedMax = Number(req.query.maxResults);
        const maxResults = Number.isFinite(requestedMax)
            ? Math.max(20, Math.min(32, requestedMax))
            : 32;

        let age = Number(req.query.age) || 10;
        let interests = [];
        let personalizedBy = 'query';

        const token = parseBearerToken(req);
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
                if (decoded?.role === 'child' && decoded?.id) {
                    const child = await Child.findById(decoded.id).select('age interests').lean();
                    if (child) {
                        age = Number(child.age) || age;
                        interests = normalizeInterests(child.interests);
                        personalizedBy = 'child-db';
                    }
                }
            } catch {
                // Keep feed available via query fallback even if token is missing/invalid.
            }
        }

        if (requestedInterest) {
            interests = [requestedInterest];
        }

        const cacheKey = JSON.stringify({
            age,
            requestedInterest: requestedInterest || null,
            interests,
            pageToken,
            maxResults,
        });

        const cached = FEED_CACHE.get(cacheKey);
        if (cached && Date.now() - cached.at < FEED_CACHE_TTL_MS) {
            return res.json({
                ...cached.payload,
                cached: true,
                personalization: {
                    by: personalizedBy,
                    age,
                    interests,
                },
            });
        }

        const apiKey = process.env.YOUTUBE_API_KEY;

        let inFlight = IN_FLIGHT_FEED.get(cacheKey);
        if (!inFlight) {
            inFlight = (async () => {
                const { fetchFeed } = await import('../SmartFetcher.mjs');
                const payload = await fetchFeed({
                    age,
                    interest: requestedInterest,
                    interests,
                    personalized: personalizedBy === 'child-db',
                    pageToken,
                    maxResults,
                    apiKey,
                });

                // If child is authenticated, personalize the feed using watch history
                if (personalizedBy === 'child-db' && token) {
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
                        if (decoded?.role === 'child' && decoded?.id && payload.videos && payload.videos.length > 0) {
                            const personalizedVideos = await personalizeVideoFeed(decoded.id, payload.videos, maxResults);
                            payload.videos = personalizedVideos;
                            payload.personalizationMethod = 'watch-history-based';
                        }
                    } catch (err) {
                        // If personalization fails, continue with original feed
                        console.warn('[feed] personalization failed:', err.message);
                        payload.personalizationMethod = 'default';
                    }
                } else {
                    payload.personalizationMethod = 'interests-based';
                }

                FEED_CACHE.set(cacheKey, { at: Date.now(), payload });
                return payload;
            })().finally(() => {
                IN_FLIGHT_FEED.delete(cacheKey);
            });
            IN_FLIGHT_FEED.set(cacheKey, inFlight);
        }

        const feed = await inFlight;

        return res.json({
            ...feed,
            cached: false,
            personalization: {
                by: personalizedBy,
                age,
                interests,
            },
        });
    } catch (error) {
        console.error('[ppu/feed] error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
