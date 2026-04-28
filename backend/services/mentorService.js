const Child = require('../models/Child');
const WatchHistory = require('../models/WatchHistory');
const ConversationTurn = require('../models/ConversationTurn');
const LearningMemory = require('../models/LearningMemory');
const VideoContextCache = require('../models/VideoContextCache');
const ChildGift = require('../models/ChildGift');
const { fetchTranscript, toPromptText, fetchVideoMetadata } = require('./transcriptService');

const VIDEO_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_HISTORY_MESSAGES = 3;
const MAX_MEMORY_TOPICS = 4;
const DEFAULT_LANG = 'en';
const DEFAULT_GROQ_MODEL = process.env.MENTOR_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const TOPIC_ALIGNMENT_MIN_SCORE = 0.12;

const TOPIC_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'but', 'if', 'then', 'that', 'this', 'it', 'its', 'as', 'by', 'from', 'about', 'into', 'what', 'why',
  'how', 'when', 'where', 'who', 'whom', 'which', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'tell',
  'me', 'you', 'we', 'they', 'i', 'my', 'your', 'our', 'their', 'please', 'explain', 'define', 'hai', 'kya', 'ka',
  'ki', 'ke', 'aur', 'mein', 'main', 'ye', 'woh', 'mujhe', 'batao', 'samjhao'
]);

function compactText(value, maxLen = 350) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function tokenizeForTopic(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function extractTopicKeywords(text, max = 8) {
  const words = tokenizeForTopic(text).filter((word) => word.length > 2 && !TOPIC_STOPWORDS.has(word));
  if (words.length === 0) return [];

  const counts = new Map();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, max);
}

function scoreTopicAlignment(question, answer) {
  const qKeywords = extractTopicKeywords(question, 8);
  const aKeywords = new Set(extractTopicKeywords(answer, 12));
  if (qKeywords.length === 0) return 1;

  const overlapCount = qKeywords.filter((w) => aKeywords.has(w)).length;
  const overlapScore = overlapCount / qKeywords.length;

  return overlapScore;
}

function isTopicAligned(question, answer) {
  const score = scoreTopicAlignment(question, answer);
  return score >= TOPIC_ALIGNMENT_MIN_SCORE;
}

function titleToTopic(value) {
  const raw = String(value || '').toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'general-curiosity';
  return cleaned.split(' ').slice(0, 4).join('-');
}

function getAgeBand(age) {
  if (age <= 6) return 'early-child';
  if (age <= 10) return 'middle-child';
  if (age <= 13) return 'pre-teen';
  return 'teen';
}

function buildSystemPrompt(age = 7, interests = [], giftsSummary = '', videoContext = '') {
  return [
    'You are Brain Bloom\'s AI Mentor—a warm, intelligent, and playful older sibling figure for children.',
    `The child is ${age} years old. Their interests include: ${interests.join(', ') || 'discovering new things'}.`,
    '',
    '### LANGUAGE RULE #1 (DYNAMIC BILINGUAL CHAMELEON):',
    '- DO NOT get stuck in the language you started with.',
    '- ACT LIKE A MIRROR: Detect the language of the child\'s VERY LAST spoken sentence.',
    '- If the child switches to English -> You MUST respond in 100% English instantly.',
    '- If the child switches to Hindi -> You MUST respond in 100% Hindi (Devanagari script) instantly.',
    '- Treat every single turn as a fresh language test. Never assume the next language based on history.',
    age <= 5 ? '- TONE: Playful Kiddish. Use "magic" explanations and sound words (Wow!, Boom!). Explain concepts as super-simple stories.' : '',
    age >= 6 && age <= 9 ? '- TONE: Explorer / Analogies. Use warm, relatable metaphors (e.g., "like a tiny tornado"). Explain the "how" using things they see at home or school.' : '',
    age >= 10 ? '- TONE: Logical Buddy. Use "big kid" language. Explain the "How/Why" with simple science/engineering logic.' : '',
    '',
    '### RELEVANCE RULE (STRICT):',
    '- FOCUS on the user\'s current question as your primary mission.',
    '- ONLY mention the "Knowledge Chest" or "Interests" if it helps explain the NEW concept via a legitimate analogy.',
    '- DO NOT force connections to old topics (like Dinosaurs) if the user is asking about something unrelated (like Space or Math).',
    '- Stay in the present moment unless a bridge is natural.',
    '',
    '### TOPIC LOCK RULE (CRITICAL):',
    '- Read the latest "User Question" and identify its main topic before answering.',
    '- Your first sentence MUST directly answer that same topic.',
    '- Reuse at least one important keyword from the user\'s question in your first sentence.',
    '- NEVER switch to a different domain unless the child explicitly asks for that new domain.',
    '- If the question is ambiguous, ask ONE short clarifying question about the same topic only.',
    '',
    '### CORE PERSONA:',
    '- PERSONAL: You are a warm mentor, but you are also intelligent. You know when to talk about the past and when to focus on the new discovery.',
    '- NATURAL VOICE: You are in a LIVE VOICE CALL. Speak like a friend, not a chatbot. No lectures.',
    '- SMART MENTOR: Bridge gaming/videos to Science, Nature, Engineering, or History only if it makes sense.',
    '',
    '### INTERACTION RULES:',
    '- BREVITY: Responses MUST be 1-3 short sentences (low latency).',
    '- ENGAGING: Always end with a curious question.',
    '',
    '### CHILD\'S KNOWLEDGE CHEST (PAST DISCOVERIES):',
    giftsSummary || 'No gifts discovered yet.',
    '',
    '### CURRENT VIDEO CONTEXT:',
    videoContext || 'No video topic right now.',
  ].filter(line => line !== null && line !== undefined).join('\n');
}

function buildPromptInput({
  child,
  conversation,
  memorySummary,
  videoContext,
  userQuestion,
  language,
}) {
  return [
    `Child Name: ${child.name}`,
    `Child Age: ${child.age}`,
    `Age Band: ${getAgeBand(child.age)}`,
    `Level: ${child.level}`,
    `Interests: ${(child.interests || []).join(', ') || 'none'}`,
    `Mode: ${child.mode || 'balanced'}`,
    `Preferred Language: ${language || DEFAULT_LANG}`,
    '',
    'Previous Learning:',
    memorySummary || 'No learning memory yet.',
    '',
    'Conversation History:',
    conversation || 'No previous messages.',
    '',
    'Video Context (if available):',
    videoContext || 'Not available for this turn.',
    '',
    'User Question:',
    userQuestion,
  ].join('\n');
}

function buildFirstTurnOpener({ childName, mode, language }) {
  const isVideoSession = mode === 'video';
  if (String(language || '').toLowerCase() === 'hindi') {
    return isVideoSession
      ? `नमस्ते ${childName}! आपने वीडियो में क्या देखा?`
      : `नमस्ते ${childName}! आज हम कौन सी मजेदार बातें करेंगे?`;
  }

  return isVideoSession
    ? `Hi ${childName}! What did you watch in the video?`
    : `Hi ${childName}! What interesting things are we going to talk about today?`;
}

function formatConversation(turns) {
  return turns
    .map((turn) => `${turn.role === 'assistant' ? 'Mentor' : 'Child'}: ${compactText(turn.content, 320)}`)
    .join('\n');
}

function formatLearningSummary(items) {
  return items
    .map((item) => `- ${item.topic}: ${compactText(item.summary, 140)} (mastery ${item.masteryLevel}/10)`)
    .join('\n');
}

function summarizeTranscript(chunks) {
  const snippet = toPromptText(chunks, { maxWords: 450 });
  if (!snippet) return '';

  const sentence = chunks
    .slice(0, 5)
    .map((chunk) => compactText(chunk.text, 90))
    .filter(Boolean)
    .join(' ');

  return compactText(sentence, 400);
}

async function resolveVideoContext(videoId) {
  if (!videoId) return { context: '', source: 'none' };

  const existing = await VideoContextCache.findOne({ videoId }).lean();
  if (existing && Date.now() - new Date(existing.fetchedAt).getTime() < VIDEO_CACHE_TTL_MS) {
    const text = [
      existing.summary ? `Summary: ${existing.summary}` : '',
      existing.transcriptSnippet ? `Transcript Snippet: ${existing.transcriptSnippet}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return { context: text, source: existing.source || 'none' };
  }

  let summary = '';
  let transcriptSnippet = '';
  let source = 'none';

  try {
    const chunks = await fetchTranscript(videoId);
    transcriptSnippet = toPromptText(chunks, { maxWords: 280 });
    summary = summarizeTranscript(chunks);
    source = 'transcript';
  } catch {
    try {
      const metadata = await fetchVideoMetadata(videoId);
      summary = compactText(
        `${metadata.title}. ${metadata.description || ''}`,
        500
      );
      source = 'metadata';
    } catch {
      source = 'none';
    }
  }

  await VideoContextCache.findOneAndUpdate(
    { videoId },
    {
      $set: {
        summary,
        transcriptSnippet: compactText(transcriptSnippet, 10000),
        source,
        fetchedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const context = [
    summary ? `Summary: ${summary}` : '',
    transcriptSnippet ? `Transcript Snippet: ${transcriptSnippet}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { context, source };
}

async function runMentorModel({ promptText, systemPrompt }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      text: 'Great question! Let us explore it together. I think the key idea is to break it into tiny steps. Want to try the first step with me?',
      source: 'fallback',
    };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptText },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Groq chat failed (${response.status}): ${errorBody.slice(0, 200)}`);
  }

  const payload = await response.json();
  const text = String(payload?.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    return {
      text: 'I am here with you. Can you ask that one more time in a short sentence so I can help better?',
      source: 'fallback-empty',
    };
  }

  return { text: compactText(text, 900), source: 'groq' };
}

async function upsertLearningMemory({ child, topic, question, answer, answeredCorrectly }) {
  const resolvedTopic = titleToTopic(topic || child.interests?.[0] || question);

  const baseSummary = answeredCorrectly
    ? `Child shows improved understanding of ${resolvedTopic}.`
    : `Child is actively exploring ${resolvedTopic} and needs another simple example.`;

  const generatedSummary = compactText(
    `${baseSummary} Latest question: ${question}. Mentor guidance: ${answer}`,
    280
  );

  const update = await LearningMemory.findOneAndUpdate(
    { childId: child._id, topic: resolvedTopic },
    {
      $set: {
        summary: generatedSummary,
        lastInteractionAt: new Date(),
      },
      $inc: {
        masteryLevel: answeredCorrectly ? 1 : 0,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    }
  );

  return update;
}

async function applyProgressReward({ child, answeredCorrectly }) {
  if (!answeredCorrectly) return { xpAwarded: 0, levelUp: false };

  const xpAwarded = 10;
  let nextXp = (child.xp || 0) + xpAwarded;
  let nextLevel = child.level || 1;
  let levelUp = false;

  while (nextXp >= nextLevel * 100) {
    nextXp -= nextLevel * 100;
    nextLevel += 1;
    levelUp = true;
  }

  await Child.findByIdAndUpdate(child._id, {
    $set: {
      xp: nextXp,
      level: nextLevel,
    },
  });

  return { xpAwarded, levelUp, nextLevel, nextXp };
}

exports.prepareVoiceContext = async ({ childId, videoId, mode = 'general' }) => {
  const child = await Child.findById(childId).lean();
  if (!child) throw new Error('Child not found');

  const [recentTurns, learningMemories, gifts, videoData] = await Promise.all([
    ConversationTurn.find({ childId }).sort({ createdAt: -1 }).limit(6).lean(),
    LearningMemory.find({ childId }).sort({ lastInteractionAt: -1 }).limit(3).lean(),
    ChildGift.find({ childId }).sort({ createdAt: -1 }).limit(5).lean(),
    resolveVideoContext(mode === 'video' ? videoId : '')
  ]);

  const conversationSummary = recentTurns.length > 0 
    ? `The child and mentor were recently discussing: ${recentTurns.slice(0, 4).map(t => compactText(t.content, 60)).join(' | ')}`
    : 'This is a new conversation session.';

  const memorySummary = formatLearningSummary(learningMemories);
  const giftsSummary = gifts
    .map(g => `- Found "${g.fact}" in video "${g.videoTitle}" (Comparison: ${g.relatableThing})`)
    .join('\n');

  const systemPrompt = buildSystemPrompt(child.age, child.interests, giftsSummary, videoData.context);

  const promptInput = [
    '### RECENT CONTEXT SUMMARY',
    conversationSummary,
    '',
    '### PREVIOUS LEARNING TOPICS',
    memorySummary || 'Welcome the new learner warmly.',
  ].join('\n');

  const isVideoSession = mode === 'video';
  let initialMsg = isVideoSession
    ? `Hi ${child.name}! What did you watch in the video?`
    : `Hi ${child.name}! What interesting things are we going to talk about today?`;

  if (child.language === 'hindi') {
    initialMsg = isVideoSession
      ? `नमस्ते ${child.name}! आपने वीडियो में क्या देखा?`
      : `नमस्ते ${child.name}! आज हम कौन सी मजेदार बातें करेंगे?`;
  }

  // Inject a cache-buster and absolute first-sentence stricture
  const finalSystemPrompt = [
    `SYSTEM CONTEXT (CACHE BUST INTENT: ${Date.now()}):`,
    systemPrompt,
    promptInput,
    '',
    '### MANDATORY FIRST STARTING SENTENCE:',
    '- YOU MUST begin the conversation by saying exactly this sentence (matching the language provided):',
    `"${initialMsg}"`,
    '- DO NOT say anything else before this sentence. DO NOT use the Dashboard default greeting.'
  ].join('\n');

  return {
    systemPrompt: finalSystemPrompt,
    initialMessage: initialMsg
  };
};

exports.buildMentorReply = async ({
  childId,
  userQuestion,
  mode = 'general',
  videoId = '',
  inputSource = 'text',
  preferredLanguage = DEFAULT_LANG,
  learningSignal = null,
}) => {
  const child = await Child.findById(childId).lean();
  if (!child) {
    throw new Error('Child not found');
  }

  const recentTurns = await ConversationTurn.find({ childId })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY_MESSAGES)
    .lean();

  const learningMemories = await LearningMemory.find({ childId })
    .sort({ lastInteractionAt: -1, updatedAt: -1 })
    .limit(MAX_MEMORY_TOPICS)
    .lean();

  const { context: videoContext, source: videoContextSource } = await resolveVideoContext(
    mode === 'video' ? videoId : ''
  );

  const conversation = formatConversation(recentTurns.reverse());
  const memorySummary = formatLearningSummary(learningMemories);

  const systemPrompt = buildSystemPrompt(child.age);
  const firstTurnOpener = recentTurns.length === 0
    ? buildFirstTurnOpener({ childName: child.name, mode, language: preferredLanguage })
    : '';
  const promptText = buildPromptInput({
    child,
    conversation,
    memorySummary,
    videoContext,
    userQuestion,
    language: preferredLanguage,
  });

  const finalPromptText = firstTurnOpener
    ? `${promptText}\n\n### FIRST REPLY RULE\nStart your reply with exactly this sentence:\n"${firstTurnOpener}"`
    : promptText;

  let ai = await runMentorModel({ promptText: finalPromptText, systemPrompt });

  // Safety retry: if the first answer drifts from the current question topic,
  // force one strict rewrite focused only on the latest user question.
  if (!isTopicAligned(userQuestion, ai.text)) {
    const repairPrompt = [
      finalPromptText,
      '',
      '### REPAIR (STRICT):',
      `Your previous answer drifted away from the current question: "${compactText(userQuestion, 220)}"`,
      'Rewrite your answer now.',
      '- Directly answer ONLY this current question topic.',
      '- Do NOT bring previous topics unless explicitly asked now.',
      '- Keep it 1-3 short sentences and end with one curious follow-up question.',
    ].join('\n');

    const repaired = await runMentorModel({ promptText: repairPrompt, systemPrompt });
    if (isTopicAligned(userQuestion, repaired.text)) {
      ai = repaired;
    }
  }

  await ConversationTurn.insertMany([
    {
      childId,
      role: 'user',
      mode,
      videoId: videoId || '',
      content: compactText(userQuestion, 1800),
      source: inputSource,
    },
    {
      childId,
      role: 'assistant',
      mode,
      videoId: videoId || '',
      content: compactText(ai.text, 1800),
      source: 'text',
    },
  ]);

  await ConversationTurn.deleteMany({
    _id: {
      $nin: (
        await ConversationTurn.find({ childId })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('_id')
          .lean()
      ).map((doc) => doc._id),
    },
    childId,
  });

  const lastWatch = mode === 'video' && videoId
    ? await WatchHistory.findOne({ childId, videoId }).lean()
    : null;

  const answeredCorrectly = Boolean(learningSignal?.answeredCorrectly);
  const topic =
    learningSignal?.topic ||
    (lastWatch && lastWatch.videoTopic) ||
    (mode === 'video' ? titleToTopic(videoId) : child.interests?.[0] || 'general-curiosity');

  const memoryUpdate = await upsertLearningMemory({
    child,
    topic,
    question: userQuestion,
    answer: ai.text,
    answeredCorrectly,
  });

  const reward = await applyProgressReward({ child, answeredCorrectly });

  return {
    text: ai.text,
    provider: ai.source,
    context: {
      mode,
      videoId: videoId || null,
      videoContextSource,
      usedHistoryCount: recentTurns.length,
      usedMemoryTopics: learningMemories.length,
    },
    memory: {
      topic: memoryUpdate.topic,
      summary: memoryUpdate.summary,
      masteryLevel: memoryUpdate.masteryLevel,
    },
    reward,
  };
};

exports.getRecentConversation = async ({ childId, mode = 'general', videoId = '', limit = 5 }) => {
  const query = { childId };
  if (mode === 'video') query.mode = 'video';
  if (videoId) query.videoId = videoId;

  const turns = await ConversationTurn.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(20, Number(limit) || 5)))
    .lean();

  return turns.reverse();
};

exports.resetConversation = async ({ childId, mode = 'general', videoId = '' }) => {
  const query = { childId };
  if (mode === 'video') {
    query.mode = 'video';
    if (videoId) query.videoId = videoId;
  } else {
    query.mode = 'general';
  }

  const result = await ConversationTurn.deleteMany(query);
  return result.deletedCount || 0;
};

exports.resolveVideoContext = resolveVideoContext;

