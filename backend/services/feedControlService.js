const WatchHistory = require('../models/WatchHistory');
const ConversationTurn = require('../models/ConversationTurn');
const LearningMemory = require('../models/LearningMemory');
const VideoContextCache = require('../models/VideoContextCache');
const { classifyByKeywords } = require('./feedTopicMap');
const { hydrateWatchHistory, ytThumbFromId } = require('./youtubeMetadata');

const DEFAULT_GROQ_MODEL = process.env.MENTOR_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;
const ADD_INTEREST_RE = /(?:add|include|append)(?:\s+(?:an?|the))?\s+(?:interest|topic|subject)?\s*(?:in|of|:|to (?:his|her|their|the) (?:interests?|list))?\s*([a-z0-9 \-]{2,40})/i;
const REMOVE_INTEREST_RE = /(?:remove|delete|drop)(?:\s+(?:the))?\s+(?:interest|topic|subject)?\s*[:\-]?\s*([a-z0-9 \-]{2,40})/i;

function extractYoutubeId(text) {
    const m = String(text || '').match(YOUTUBE_RE);
    return m ? m[1] : null;
}

function sanitizeTopic(raw) {
    return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9 \-]/g, '').replace(/\s+/g, ' ').slice(0, 40);
}

const STOP_WORDS = new Set(['please', 'kindly', 'now', 'to', 'him', 'her', 'them', 'kid', 'child', 'a', 'an', 'the']);
function cleanInterestPhrase(value) {
    return sanitizeTopic(value)
        .split(' ')
        .filter((w) => w && !STOP_WORDS.has(w))
        .join(' ')
        .trim();
}

function detectLocalActions(text) {
    const actions = [];
    const addMatch = text.match(ADD_INTEREST_RE);
    if (addMatch) {
        const value = cleanInterestPhrase(addMatch[1]);
        if (value && value.length >= 2) actions.push({ type: 'add_interest', value });
    }
    const rmMatch = text.match(REMOVE_INTEREST_RE);
    if (rmMatch) {
        const value = cleanInterestPhrase(rmMatch[1]);
        if (value && value.length >= 2) actions.push({ type: 'remove_interest', value });
    }
    return actions;
}

async function buildChildSnapshot(childId) {
    const [watchAgg, recentVideos, recentTurnsCount, memories, recentTopics] = await Promise.all([
        WatchHistory.aggregate([
            { $match: { childId } },
            { $group: { _id: null, totalSeconds: { $sum: { $ifNull: ['$lastWatchedTime', 0] } }, videos: { $sum: 1 } } },
        ]),
        WatchHistory.find({ childId }).sort({ updatedAt: -1 }).limit(20).lean(),
        ConversationTurn.countDocuments({ childId }),
        LearningMemory.find({ childId }).sort({ lastInteractionAt: -1 }).limit(8).lean(),
        WatchHistory.aggregate([
            { $match: { childId, videoTopic: { $ne: '' } } },
            { $group: { _id: '$videoTopic', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 },
        ]),
    ]);

    const ids = recentVideos.map((v) => v.videoId).filter(Boolean);
    const [hydrated, ctxRows] = await Promise.all([
        hydrateWatchHistory(recentVideos),
        ids.length ? VideoContextCache.find({ videoId: { $in: ids } }).lean() : Promise.resolve([]),
    ]);
    const ctxByVid = new Map(ctxRows.map((r) => [r.videoId, r]));
    const recentWatched = hydrated.map((v) => {
        const ctx = ctxByVid.get(v.videoId);
        return {
            videoId: v.videoId,
            title: v.videoTitle || '',
            thumbnail: v.videoThumbnail || ytThumbFromId(v.videoId),
            channel: v.videoChannel || '',
            topic: v.videoTopic || '',
            duration: v.videoDuration || '',
            lastWatchedTime: v.lastWatchedTime || 0,
            completion: v.completion || 0,
            updatedAt: v.updatedAt || v.createdAt,
            summary: ctx?.summary || '',
        };
    });

    return {
        totalMinutes: Math.round((watchAgg[0]?.totalSeconds || 0) / 60),
        totalVideos: watchAgg[0]?.videos || 0,
        aiInteractions: recentTurnsCount,
        topMemories: memories.map((m) => ({ topic: m.topic, summary: m.summary, mastery: m.masteryLevel })),
        topTopics: recentTopics.map((r) => ({ topic: r._id, count: r.count })),
        recentWatched,
    };
}

function fmtSecs(s) {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${m}m ${String(sec).padStart(2, '0')}s`;
}

function buildSystemPrompt(child, snapshot) {
    const watchedLines = snapshot.recentWatched.slice(0, 6).map((w, i) => {
        const sumPart = w.summary ? ` | summary: ${w.summary.slice(0, 160)}` : '';
        return `  ${i + 1}. "${w.title || w.videoId}" (topic: ${w.topic || 'unknown'}, last position ${fmtSecs(w.lastWatchedTime)}, ${w.completion}% done)${sumPart}`;
    }).join('\n') || '  (no videos watched yet)';

    return [
        `You are FeedControl, a warm, concise AI co-pilot helping a parent shape what their child watches and learns. You sound like a thoughtful learning coach, not a chatbot.`,
        `Default length: 2-5 short sentences. For "summarize" requests, use the SUMMARY FORMAT below.`,
        `Always reference the child by name and ground every claim in the data below — never invent watch history, interests, or videos.`,
        ``,
        `CHILD PROFILE`,
        `- Name: ${child.name} (age ${child.age}, language: ${child.language || 'english'})`,
        `- Declared interests: ${(child.interests || []).join(', ') || 'none yet'}`,
        `- Top topics watched: ${snapshot.topTopics.map((t) => `${t.topic}(${t.count})`).join(', ') || 'no data yet'}`,
        `- Lifetime: ${snapshot.totalVideos} videos, ${snapshot.totalMinutes} minutes, ${snapshot.aiInteractions} AI mentor chats`,
        `- Learning mastery: ${snapshot.topMemories.map((m) => `${m.topic}=${m.mastery}/10`).join(', ') || 'none yet'}`,
        ``,
        `RECENT WATCH HISTORY (most recent first)`,
        watchedLines,
        ``,
        `ACTIONS YOU CAN PROPOSE`,
        `  1) add_interest    — add a topic to the child's interest list. Lowercase short phrases (e.g. "space", "ancient egypt"). You MAY emit multiple.`,
        `  2) remove_interest — remove a topic that no longer fits.`,
        `  3) add_video       — queue a YouTube video the parent shared OR one you actively recommend.`,
        `  4) block_video     — refuse to add a video the parent shared because the system marked it unsafe or age-inappropriate.`,
        ``,
        `RULES FOR YOUTUBE LINKS`,
        `- The system will hand you a [video review] block with safety, ageAppropriate, topic, concepts and a oneLineSummary.`,
        `- If safe AND ageAppropriate: confirm what the video is about in 1 sentence, name the genre, and emit add_video + one add_interest per concept (max 3).`,
        `- If unsafe OR age-inappropriate: politely refuse, quote the system's reason in plain language, suggest 1 safer alternative topic from the child's existing interests, and emit ONLY a block_video action — do NOT emit add_interest or add_video.`,
        ``,
        `SUMMARY FORMAT (use whenever the parent asks for a summary, recap, "how is my child doing", or growth check)`,
        `Reply with 4 short labelled lines:`,
        `  "📚 Watching: <2-3 themes from RECENT WATCH HISTORY, with one concrete title>"`,
        `  "🌱 Growth: <one sentence on whether their watching is widening or narrowing curiosity, judged from topic spread + mastery>"`,
        `  "🎯 Interests right now: <comma list from declared + top topics>"`,
        `  "🧪 Try together: <one specific 10-minute real-world activity tied to the strongest topic, e.g. 'mix baking soda + vinegar to recreate the volcano they watched'>"`,
        ``,
        `Respond ONLY with JSON, no markdown fences:`,
        `{"reply":"<message to parent, may contain newlines>","actions":[{"type":"add_interest","value":"topic"},{"type":"remove_interest","value":"topic"},{"type":"add_video","videoId":"abc","url":"https://...","title":""},{"type":"block_video","videoId":"abc","reason":"<short>"}]}`,
        `If you have no action, return an empty actions array.`,
    ].join('\n');
}

function buildHistory(messages, max = 10) {
    return messages.slice(-max).map((m) => ({ role: m.role, content: m.content }));
}

async function callGroq({ system, history, userMessage, contextHint = '' }) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
        return {
            reply: contextHint || `I'm reading your child's recent activity. What would you like to add or adjust today?`,
            actions: [],
            source: 'fallback',
        };
    }
    const userContent = contextHint ? `${userMessage}\n\n[system-detected context]\n${contextHint}` : userMessage;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: DEFAULT_GROQ_MODEL,
            temperature: 0.5,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userContent }],
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Groq feed-control failed (${res.status}): ${body.slice(0, 180)}`);
    }
    const payload = await res.json();
    const raw = String(payload?.choices?.[0]?.message?.content || '').trim();
    try {
        const parsed = JSON.parse(raw);
        return {
            reply: String(parsed.reply || '').trim() || 'Got it.',
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            source: 'groq',
        };
    } catch {
        return { reply: raw || 'Got it.', actions: [], source: 'groq-raw' };
    }
}

function buildGreeting(child, snapshot) {
    const lines = [];
    lines.push(`Hi! Here's a quick read on ${child.name}.`);
    if (snapshot.totalMinutes === 0 && snapshot.totalVideos === 0) {
        lines.push(`No watch activity yet — once they start, I'll surface trends here.`);
    } else {
        lines.push(`So far ${snapshot.totalVideos} videos and ${snapshot.totalMinutes} minutes watched, with ${snapshot.aiInteractions} AI mentor chats.`);
    }
    if (snapshot.recentWatched.length) {
        const last = snapshot.recentWatched[0];
        if (last.title) lines.push(`Most recent: "${last.title.slice(0, 70)}"${last.topic ? ` (${last.topic})` : ''}.`);
    }
    if (snapshot.topTopics.length) {
        const top = snapshot.topTopics.slice(0, 3).map((t) => t.topic).join(', ');
        lines.push(`Strongest pull: ${top}.`);
    } else if ((child.interests || []).length) {
        lines.push(`Declared interests: ${child.interests.join(', ')}.`);
    }
    lines.push(`Want to add a new interest, share a YouTube video, or get an activity idea?`);
    return lines.join(' ');
}

// Look up cached transcript/summary for a videoId; if missing, lazily hydrate
// using mentorService.resolveVideoContext (which hits transcript/metadata).
async function loadVideoCacheOrFetch(videoId) {
    if (!videoId) return null;
    let cached = await VideoContextCache.findOne({ videoId }).lean();
    if (!cached || (!cached.summary && !cached.transcriptSnippet)) {
        try {
            const { resolveVideoContext } = require('./mentorService');
            await resolveVideoContext(videoId);
            cached = await VideoContextCache.findOne({ videoId }).lean();
        } catch (err) {
            console.warn(`[feedControl] resolveVideoContext failed for ${videoId}:`, err.message);
        }
    }
    return cached || null;
}

// Heuristic safety pass over a transcript/summary blob — used as a fallback
// when the LLM is unavailable. Catches the obvious red flags only.
const UNSAFE_PATTERNS = [
    /\b(porn|sexual|explicit|nsfw|nude|nudity)\b/i,
    /\b(suicide|self[\s-]?harm|kill yourself)\b/i,
    /\b(graphic violence|gore|behead|murder tutorial)\b/i,
    /\b(buy drugs|how to make (?:meth|cocaine|bomb))\b/i,
    /\b(crypto scam|gambling site|onlyfans)\b/i,
];
function heuristicSafety(text, age) {
    const blob = String(text || '');
    for (const re of UNSAFE_PATTERNS) {
        if (re.test(blob)) return { safe: false, ageAppropriate: false, reason: 'Contains adult / harmful keywords.' };
    }
    if (age <= 8 && /\b(horror|scary|haunted|nightmare)\b/i.test(blob)) {
        return { safe: true, ageAppropriate: false, reason: `May be too intense for age ${age}.` };
    }
    return { safe: true, ageAppropriate: true, reason: '' };
}

// Ask Groq to review a video for a specific child: safety + age fit + topic +
// concept extraction. Falls back to local heuristics + keyword classifier when
// no Groq key is configured or the call fails.
async function reviewVideoForChild({ videoId, childAge, parentText }) {
    const cached = await loadVideoCacheOrFetch(videoId);
    const summary = cached?.summary || '';
    const transcript = cached?.transcriptSnippet || '';
    const blob = [summary, transcript, parentText].filter(Boolean).join('\n').slice(0, 3500);
    const fallbackTopic = classifyByKeywords([summary, transcript, parentText].filter(Boolean).join(' ')) || '';
    const heur = heuristicSafety(blob, childAge);

    const key = process.env.GROQ_API_KEY;
    if (!key || !blob) {
        return {
            safe: heur.safe,
            ageAppropriate: heur.ageAppropriate,
            reason: heur.reason,
            topic: fallbackTopic,
            concepts: fallbackTopic ? [fallbackTopic] : [],
            oneLineSummary: summary.slice(0, 200),
            source: cached?.source || 'none',
        };
    }

    const sys = `You are a child-safety classifier for an educational platform. Given a YouTube video transcript/summary and the child's age, decide if it is safe and age-appropriate, then extract the educational concept(s) the child would learn. Respond with strict JSON only.`;
    const user = `Child age: ${childAge}\nParent's note: "${parentText || '(none)'}"\nVideo content:\n"""${blob}"""\n\nReturn JSON of shape:\n{"safe":true|false,"ageAppropriate":true|false,"reason":"<short>","topic":"<one lowercase short phrase>","concepts":["concept1","concept2"],"oneLineSummary":"<<= 160 chars>"}`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: DEFAULT_GROQ_MODEL,
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
            }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const payload = await res.json();
        const parsed = JSON.parse(payload?.choices?.[0]?.message?.content || '{}');
        const concepts = Array.isArray(parsed.concepts)
            ? parsed.concepts.map(sanitizeTopic).filter((c) => c && c.length >= 2).slice(0, 4)
            : [];
        return {
            safe: parsed.safe !== false && heur.safe,
            ageAppropriate: parsed.ageAppropriate !== false && heur.ageAppropriate,
            reason: String(parsed.reason || heur.reason || '').slice(0, 240),
            topic: sanitizeTopic(parsed.topic) || fallbackTopic,
            concepts: concepts.length ? concepts : (fallbackTopic ? [fallbackTopic] : []),
            oneLineSummary: String(parsed.oneLineSummary || summary || '').slice(0, 200),
            source: cached?.source || 'groq',
        };
    } catch (err) {
        console.warn('[feedControl] reviewVideoForChild Groq failed:', err.message);
        return {
            safe: heur.safe,
            ageAppropriate: heur.ageAppropriate,
            reason: heur.reason,
            topic: fallbackTopic,
            concepts: fallbackTopic ? [fallbackTopic] : [],
            oneLineSummary: summary.slice(0, 200),
            source: cached?.source || 'fallback',
        };
    }
}

module.exports = {
    extractYoutubeId,
    sanitizeTopic,
    detectLocalActions,
    buildChildSnapshot,
    buildSystemPrompt,
    buildHistory,
    callGroq,
    buildGreeting,
    reviewVideoForChild,
};
