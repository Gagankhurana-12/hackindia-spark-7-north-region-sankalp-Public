// geminiService.js — extracts age-aware "Wow Factors" using Groq chat models.
// Falls back to a deterministic heuristic when GROQ_API_KEY is missing.
//
// Wow Factor voice = an excited friend leaning in: "Hey, did you know...?"
// Every fact MUST open with one of the curiosity hooks below so TTS lands hard.

const { pickBeats, toPromptText } = require('./transcriptService');
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_MODEL_FALLBACKS = [
    DEFAULT_GROQ_MODEL,
    'llama-3.3-70b-versatile',
];

const CURIOSITY_HOOKS = [
    'Hey, did you know',
    'Wait — what if I told you',
    "Here's something wild:",
    'Quick — guess what?',
    'Psst… check this out:',
    'Believe it or not,',
    'You won’t believe this, but',
];

function bandOf(age) {
    const a = Number(age) || 10;
    if (a <= 5) return 'sensory';
    if (a <= 12) return 'functional';
    return 'specialist';
}

function voiceGuideFor(band) {
    if (band === 'sensory') return 'Very short, playful, and high energy. Under 22 words. Use sensory words like "Boom!", "Flash!", or "Magic!".';
    if (band === 'functional') return 'Surprising and informative. Under 30 words. Include a "did you know" fact that links to a real-world object.';
    return 'Sophisticated but mind-blowing. Under 40 words. Focus on the core engineering or biological mechanism.';
}

function buildPrompt({ transcriptText, age, band, interest, durationSeconds }) {
    const minTs = Math.floor((durationSeconds || 120) * 0.15);
    const maxTs = Math.floor((durationSeconds || 120) * 0.85);

    return `You are Brain Bloom's AI Mentor, a warm and encouraging parent-like guide. 
Your goal is to turn passive watching into a "mind-opening" discovery for a ${age}-year-old.

### THE MISSION
Extract 2 "Wow Facts" that pause the video to reveal an exciting real-world connection. 
The child should feel: "Wait... that's real? How does that work?"

### THE 5-STEP CURIOSITY CHAIN:
1. HOOK: A short, natural interruption. Sounds like a surprising discovery, not a lesson.
   Examples: "Hey, did you know?", "Wait... this is actually real.", "Acha, fun fact...", "That's way cooler than it looks."
2. REAL-WORLD FASCINATING CONNECTION: Connect to a surprising scientific idea, machine, nature, space, history, or engineering. (e.g., how wings create lift, how eclipses happen).
3. CURIOSITY BRIDGE: Explain the logic simply but SMARTLY so it feels exciting. "Ohhh... this happens in real life too?"
4. GIFT UNLOCK TOPIC: Open a highly interesting next idea derived from the real-world connection. 
5. RECOMMENDED NEXT VIDEO THEME: A specific YouTube search term for the gift.

### STRICT RULES:
- NEVER generate generic facts or boring textbook explanations.
- NO entertainment, songs, gaming clips, or cartoons for gifts. 
- Gifts MUST be related to Science, Invention, History, Nature, Logic, or Engineering.
- The Fact and Gift must feel like ONE CONNECTED discovery.
- TIMESTAMPS: Only between [${minTs}s] and [${maxTs}s].
- ${voiceGuideFor(band)}

Return ONLY this JSON structure:
{
  "wowFactors": [
    {
      "timestamp": <int>,
      "fact": "<Hook> <Real-World Fascinating Connection> <Curiosity Bridge>",
      "relatableThing": "<Gift Unlock Topic>",
      "bridgeSearchQuery": "<Recommended Next video theme - 3-5 words>",
      "giftType": "video"
    }
  ]
}`;
}

function stripJsonFences(s) {
    return String(s || '')
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
}

function ensureHook(text) {
    const t = String(text || '').trim();
    if (!t) return t;
    const hit = CURIOSITY_HOOKS.some(h => t.toLowerCase().startsWith(h.toLowerCase().replace(/…$/, '').replace(/:$/, '')));
    if (hit) return t;
    return `Hey, did you know — ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

function validateAndClean(parsed) {
    if (!parsed || !Array.isArray(parsed.wowFactors)) return null;
    const cleaned = parsed.wowFactors
        .map(w => ({
            timestamp: Math.max(0, Math.floor(Number(w.timestamp) || 0)),
            fact: ensureHook(w.fact),
            relatableThing: String(w.relatableThing || 'something cool').trim(),
            bridgeSearchQuery: String(w.bridgeSearchQuery || w.relatableThing || '').trim(),
            giftType: ['video', 'rocket', 'star', 'diamond', 'crown', 'magic-box'].includes(w.giftType) ? w.giftType : 'video',
            unboxed: false
        }))
        .filter(w => w.fact && w.timestamp >= 0);
    if (!cleaned.length) return null;
    return { wowFactors: cleaned.slice(0, 2) };
}

async function generateJsonWithModel({ apiKey, modelName, prompt, label }) {
    const t0 = Date.now();
    console.log(`[groq] ${label}: calling ${modelName}…`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are GrowthFeed AI Mentor. Return strict minified JSON only in requested schema.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Groq HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = stripJsonFences(data?.choices?.[0]?.message?.content || '');
    if (!text) throw new Error('Groq empty completion');
    console.log(`[groq] ${label}: ${modelName} responded in ${Date.now() - t0}ms (${text.length} chars)`);
    return text;
}

async function generateJsonWithFallbacks({ apiKey, prompt, label }) {
    let lastError = null;

    for (const modelName of GROQ_MODEL_FALLBACKS) {
        try {
            return await generateJsonWithModel({ apiKey, modelName, prompt, label });
        } catch (err) {
            lastError = err;
            console.warn(`[groq] ${label}: ${modelName} failed (${err.message})`);
        }
    }

    throw lastError || new Error('Groq failed for all configured models');
}

// Heuristic fallback used when the key is missing or Groq fails.
function heuristicFromTranscript(chunks, age) {
    const band = bandOf(age);
    const ts1 = chunks.length ? chunks[Math.floor(chunks.length * 0.3)].start : 30;
    const ts2 = chunks.length ? chunks[Math.floor(chunks.length * 0.7)].start : 70;

    const hooks = CURIOSITY_HOOKS;
    return {
        wowFactors: [
            {
                timestamp: Math.floor(ts1),
                fact: `Wait... this is actually real! The way this giant gear is turning is exactly how huge telescope mirrors are moved to peek at distant galaxies in space. Isn't that way cooler than it looks?`,
                relatableThing: 'How do space telescopes move?',
                bridgeSearchQuery: 'how hubble and webb telescopes work for kids',
                giftType: 'video',
                unboxed: false
            },
            {
                timestamp: Math.floor(ts2),
                fact: `That's way cooler than it looks! Humans used this same simple logic of balance to lift giant stones heavier than cars while building ancient wonders like the Pyramids. Nature uses it too!`,
                relatableThing: 'How were pyramids built without machines?',
                bridgeSearchQuery: 'pyramid engineering for kids',
                giftType: 'video',
                unboxed: false
            }
        ]
    };
}

exports.generateWowFactors = async ({ chunks, age = 10, interest = null }) => {
    const band = bandOf(age);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.log(`[groq] no GROQ_API_KEY — using heuristic fallback (${chunks.length} chunks, band=${band})`);
        return { ...heuristicFromTranscript(chunks, age), source: 'heuristic' };
    }

    try {
        const transcriptText = toPromptText(chunks, { maxWords: 1800 });
        if (!transcriptText) {
            console.warn(`[groq] empty prompt text — falling back to heuristic`);
            return { ...heuristicFromTranscript(chunks, age), source: 'heuristic' };
        }

        const wordCount = transcriptText.split(/\s+/).length;
        console.log(`[groq] calling ${GROQ_MODEL_FALLBACKS.join(' -> ')} (band=${band}, age=${age}, prompt≈${wordCount} words)…`);

        const prompt = buildPrompt({ transcriptText, age, band, interest, durationSeconds: (chunks[chunks.length - 1]?.start || 180) }) + `\n\nTRANSCRIPT:\n${transcriptText}`;
        const text = await generateJsonWithFallbacks({ apiKey, prompt, label: 'transcript' });
        const parsed = JSON.parse(text);
        const valid = validateAndClean(parsed);
        if (!valid) {
            console.warn(`[groq] invalid JSON shape — falling back to heuristic`);
            return { ...heuristicFromTranscript(chunks, age), source: 'heuristic-invalid-json' };
        }
        console.log(`[groq] ${valid.wowFactors.length} Wow Factors @ [${valid.wowFactors.map(w => w.timestamp + 's').join(', ')}]`);
        return { ...valid, source: 'groq' };
    } catch (err) {
        console.error('[groq] ERROR:', err.message);
        return { ...heuristicFromTranscript(chunks, age), source: 'heuristic-error' };
    }
};

// --- Metadata-only path --------------------------------------------------
// Used when YouTube captions are unavailable (captionless video, or YouTube's
// `exp=xpe` bot-detection returning empty caption bodies). We feed the video's
// own title/description/keywords to Groq and distribute the 2 Wow Factor
// timestamps across the video's duration.

function buildMetadataPrompt({ metadata, age, band, interest }) {
    const hooks = CURIOSITY_HOOKS.map(h => `"${h}…"`).join(', ');
    const len = Math.max(30, Math.floor(metadata.lengthSeconds || 180));
    const ts1 = Math.floor(len * 0.35);
    const ts2 = Math.floor(len * 0.65);
    return `You are GrowthFeed's AI Mentor. Pick 2 moments that "connect the dots" for a ${age}-year-old about ${metadata.title}.
    
Rules:
- Hook: Start with ${hooks}.
- Relatable: Connect to a topic CLOSELY linked to this video.
- Gift: Assign 'bridgeSearchQuery' (3-5 word search term) and 'giftType': "video".

Return JSON only:
{"wowFactors":[{"timestamp":${ts1},"fact":"...","relatableThing":"...","bridgeSearchQuery":"...","giftType":"video"}]}`;
}

function heuristicFromMetadata(metadata, age) {
    const band = bandOf(age);
    const len = Math.max(30, Math.floor(metadata.lengthSeconds || 180));
    const ts1 = Math.floor(len * 0.35);
    const ts2 = Math.floor(len * 0.65);
    const topic = metadata.title || (metadata.keywords || [])[0] || 'this topic';
    return {
        wowFactors: [
            { timestamp: ts1, fact: `Hey, did you know — ${topic} is full of surprises!`, relatableThing: 'a treasure chest', giftType: 'crown', unboxed: false },
            { timestamp: ts2, fact: `Here's something wild: ${topic} actually works like a big machine!`, relatableThing: 'a giant robot', giftType: 'star', unboxed: false },
        ],
    };
}

exports.generateWowFactorsFromMetadata = async ({ metadata, age = 10, interest = null }) => {
    const band = bandOf(age);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.log(`[groq] metadata-mode: no GROQ_API_KEY — using deterministic fallback (title="${metadata.title.slice(0, 40)}")`);
        return { ...heuristicFromMetadata(metadata, age), source: 'heuristic-metadata' };
    }

    try {
        console.log(`[groq] metadata-mode: calling ${GROQ_MODEL_FALLBACKS.join(' -> ')} (band=${band}, age=${age}, title="${metadata.title.slice(0, 40)}")…`);

        const prompt = buildMetadataPrompt({ metadata, age, band, interest });
        const text = await generateJsonWithFallbacks({ apiKey, prompt, label: 'metadata' });
        const parsed = JSON.parse(text);
        const valid = validateAndClean(parsed);
        if (!valid) {
            console.warn('[groq] metadata-mode: invalid JSON shape — falling back to heuristic');
            return { ...heuristicFromMetadata(metadata, age), source: 'heuristic-metadata-invalid' };
        }
        console.log(`[groq] metadata-mode: ${valid.wowFactors.length} Wow Factors @ [${valid.wowFactors.map(w => w.timestamp + 's').join(', ')}]`);
        return { ...valid, source: 'groq-metadata' };
    } catch (err) {
        console.error('[groq] metadata-mode ERROR:', err.message);
        return { ...heuristicFromMetadata(metadata, age), source: 'heuristic-metadata-error' };
    }
};

exports._internals = { CURIOSITY_HOOKS, ensureHook, bandOf, validateAndClean };
