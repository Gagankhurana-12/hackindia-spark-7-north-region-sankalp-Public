const DailyMission = require('../models/DailyMission');
const Child = require('../models/Child');
const WatchHistory = require('../models/WatchHistory');

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_MODEL_FALLBACKS = [
    DEFAULT_GROQ_MODEL,
    'llama-3.3-70b-versatile',
];

function getAgeMode(age) {
    if (age <= 5) return 'sensory';
    if (age <= 10) return 'explorer';
    return 'builder';
}

function stripJsonFences(s) {
    return String(s || '')
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
}

async function generateJsonWithModel({ apiKey, modelName, prompt, label }) {
    const t0 = Date.now();
    console.log(`[mission] ${label}: calling ${modelName}…`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
            temperature: 0.8,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are Brain Bloom\'s Daily Mission Generator. Your goal is to turn passive watching into real-world action. Return strict JSON only.',
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
    return text;
}

async function generateJsonWithFallbacks({ apiKey, prompt, label }) {
    let lastError = null;
    for (const modelName of GROQ_MODEL_FALLBACKS) {
        try {
            return await generateJsonWithModel({ apiKey, modelName, prompt, label });
        } catch (err) {
            lastError = err;
            console.warn(`[mission] ${label}: ${modelName} failed (${err.message})`);
        }
    }
    throw lastError || new Error('Groq failed for all configured models');
}

exports.getOrGenerateDailyMission = async (childId) => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Check if mission exists for today
    let mission = await DailyMission.findOne({ childId, date: today });
    if (mission) return mission;

    // 2. Fetch child context
    const child = await Child.findById(childId);
    if (!child) throw new Error('Child not found');

    const ageMode = getAgeMode(child.age);
    const history = await WatchHistory.find({ childId }).sort({ watchedAt: -1 }).limit(5).lean();
    const recentTopics = child.topicsWatched.slice(-5).join(', ');
    const interests = child.interests.join(', ');

    // 3. Build Prompt
    const prompt = `
Generate a daily mission for a child named ${child.name} who is ${child.age} years old (${ageMode} mode).

CONTEXT:
- Interests: ${interests}
- Recently watched topics: ${recentTopics}
- Recent history: ${history.map(h => h.videoTitle).join(', ')}

AGE-SPECIFIC GUIDELINES:
- MODE: ${ageMode}
${ageMode === 'sensory' ? `
- Sensory Mode (Ages 3-5):
- Focus on touch, observation, matching, finding things.
- Parent-assisted (add "with a grown-up" if needed).
- Highly visual, simple language, very short steps.
- Title should be very playful.
` : ageMode === 'explorer' ? `
- Explorer Mode (Ages 6-10):
- Hands-on discovery, simple experiments, mini builds.
- Curiosity-driven. 
- Steps should feel like a quest.
` : `
- Builder Mode (Ages 11-15):
- Independent, logic-based, problem-solving, design challenges.
- More mature but still engaging.
- UI will be modern/clean, so avoid overly "babyish" language.
`}

MISSION COMPONENTS:
1. title: Short, exciting challenge name.
2. curiosityHook: One short line to grab attention.
3. instructions: Array of 3-4 steps. Each step must have:
   - step: The action text (short!).
   - icon: A simple emoji or keyword representing the step (e.g. 🎈, 🔍, 🛠️).
   - label: A 1-2 word playful label for the step sticker.
4. whatYouWillLearn: One short line connecting it to a real-world concept (no "school" talk).

RETURN JSON STRUCTURE:
{
  "title": "...",
  "curiosityHook": "...",
  "instructions": [
    { "step": "...", "icon": "...", "label": "..." },
    ...
  ],
  "whatYouWillLearn": "..."
}
`;

    // 4. Call AI
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        // Fallback mission if no API key
        return await DailyMission.create({
            childId,
            date: today,
            ageMode,
            title: "The Garden Detective",
            curiosityHook: "There are secret patterns hidden in the leaves!",
            instructions: [
                { step: "Find 3 different shaped leaves", icon: "🍃", label: "Find" },
                { step: "Trace them onto a piece of paper", icon: "✏️", label: "Trace" },
                { step: "Color them with their real colors", icon: "🎨", label: "Color" }
            ],
            whatYouWillLearn: "Every plant has its own unique fingerprint!"
        });
    }

    try {
        const text = await generateJsonWithFallbacks({ apiKey, prompt, label: `mission-${child.name}` });
        const parsed = JSON.parse(text);

        mission = await DailyMission.create({
            childId,
            date: today,
            ageMode,
            title: parsed.title,
            curiosityHook: parsed.curiosityHook,
            instructions: parsed.instructions,
            whatYouWillLearn: parsed.whatYouWillLearn,
        });

        return mission;
    } catch (err) {
        console.error('Mission generation failed:', err);
        // Emergency fallback
        return await DailyMission.create({
            childId,
            date: today,
            ageMode,
            title: "Curiosity Discovery",
            curiosityHook: "You unlocked a secret mission!",
            instructions: [
                { step: "Spot something interesting", icon: "👀", label: "Spot" },
                { step: "Draw it", icon: "✏️", label: "Draw" },
                { step: "Show a friend", icon: "🤝", label: "Share" }
            ],
            whatYouWillLearn: "Discovery is everywhere!"
        });
    }
};

exports.completeMission = async (missionId) => {
    return await DailyMission.findByIdAndUpdate(missionId, { status: 'completed' }, { new: true });
};
