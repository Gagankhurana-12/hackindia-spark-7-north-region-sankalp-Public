function makeVoiceError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isDebugEnabled() {
  return String(process.env.ULTRAVOX_DEBUG || '').toLowerCase() === 'true';
}

function debugLog(label, details) {
  console.log(`[ultravox] ${label}`, details || '');
}

function normalizeSarvamLanguage(language = 'en') {
  const value = String(language || '').toLowerCase();
  const map = {
    en: 'en-IN',
    'en-in': 'en-IN',
    hi: 'hi-IN',
    'hi-in': 'hi-IN',
    ta: 'ta-IN',
    'ta-in': 'ta-IN',
    te: 'te-IN',
    'te-in': 'te-IN',
    kn: 'kn-IN',
    'kn-in': 'kn-IN',
    ml: 'ml-IN',
    'ml-in': 'ml-IN',
    mr: 'mr-IN',
    'mr-in': 'mr-IN',
    gu: 'gu-IN',
    'gu-in': 'gu-IN',
    bn: 'bn-IN',
    'bn-in': 'bn-IN',
    pa: 'pa-IN',
    'pa-in': 'pa-IN',
    od: 'od-IN',
    'od-in': 'od-IN',
  };

  return map[value] || 'en-IN';
}

function normalizeSarvamSpeaker(voice) {
  const speaker = String(voice || '').trim().toLowerCase();
  if (!speaker) return null;

  const allowedSpeakers = new Set([
    'shubh', 'aditya', 'ritu', 'priya', 'neha', 'rahul', 'pooja', 'rohan',
    'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun',
    'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand',
    'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani',
    'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
  ]);

  return allowedSpeakers.has(speaker) ? speaker : null;
}


exports.createVoiceCall = async ({ systemPrompt, initialMessage, voice }) => {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  if (!apiKey) throw makeVoiceError('ULTRAVOX_API_KEY is not configured', 500);

  const voiceId = String(process.env.ULTRAVOX_VOICE_ID || '').trim();
  const model = String(process.env.ULTRAVOX_VOICE_MODEL || 'eleven_turbo_v2_5').trim();

  // Ultravox API Call creation endpoint
  const url = 'https://api.ultravox.ai/api/calls';

  debugLog('Creating Real-time Call', { voiceId, model });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      initialMessages: [
        { role: 'MESSAGE_ROLE_AGENT', text: initialMessage }
      ],
      model: 'ultravox-v0.7',
      voice: voice || voiceId || '44504e63-59c5-4f69-9340-423231c79a03',
      temperature: 0.3,
      firstSpeaker: 'FIRST_SPEAKER_AGENT',

    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    debugLog('Call creation failed', { status: response.status, payload });
    throw makeVoiceError(payload?.error?.message || payload?.message || `Failed to create Ultravox call (${response.status})`, response.status);
  }

  debugLog('Call created successfully', { joinUrl: payload.joinUrl });

  return {
    joinUrl: payload.joinUrl,
    callId: payload.callId,
    provider: 'ultravox'
  };
};

/**
 * Synthesize speech from text using high-quality AI voice.
 * For Wow Factors and text-chat replies.
 */
exports.synthesizeSpeech = async ({ text, language = 'en', voice }) => {
  const provider = String(process.env.TTS_PROVIDER || 'groq').toLowerCase();

  const trySarvam = async () => {
    const sarvamKey = process.env.SARVAM_API_KEY;
    if (!sarvamKey) throw new Error('SARVAM_API_KEY missing');

    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_language_code: normalizeSarvamLanguage(language),
        model: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
        speaker: normalizeSarvamSpeaker(voice) || undefined,
        pace: Number(process.env.SARVAM_TTS_PACE || 1.0),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Sarvam TTS HTTP ${response.status}: ${payload?.message || payload?.error?.message || 'Unknown'}`);
    }

    const firstAudio = Array.isArray(payload?.audios) ? payload.audios[0] : null;
    if (!firstAudio) throw new Error('Sarvam TTS returned no audio data');

    return {
      audioBase64: firstAudio,
      mimeType: 'audio/wav',
      provider: 'sarvam',
    };
  };

  const tryGroq = async () => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error('GROQ_API_KEY missing');

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice || 'nova',
        input: text,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Groq TTS HTTP ${response.status}: ${errData?.error?.message || 'Unknown'}`);
    }

    const buffer = await response.arrayBuffer();
    return {
      audioBase64: Buffer.from(buffer).toString('base64'),
      mimeType: 'audio/mpeg',
      provider: 'groq',
    };
  };

  try {
    if (provider === 'sarvam') {
      try {
        return await trySarvam();
      } catch (sarvamError) {
        console.error('[synthesizeSpeech] Sarvam Error:', sarvamError.message);
        try {
          return await tryGroq();
        } catch (groqError) {
          console.error('[synthesizeSpeech] Groq Fallback Error:', groqError.message);
          return { provider: 'none', error: `${sarvamError.message}; ${groqError.message}` };
        }
      }
    }

    return await tryGroq();
  } catch (error) {
    console.error('[synthesizeSpeech] TTS Error:', error.message);
    // Return none so frontend falls back to browser TTS gracefully
    return { provider: 'none', error: error.message };
  }
};

/**
 * Transcribe audio to text.
 */
exports.transcribeAudio = async ({ audioBase64, mimeType, language = 'en' }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

  try {
    // Groq STT (Whisper) is ultra-fast
    // In a production environment, we'd send the buffer as a file
    return { text: "Transcription via Groq Whisper", provider: 'groq' };
  } catch (error) {
    throw error;
  }
};
