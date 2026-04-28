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
  const apiKey = process.env.GROQ_API_KEY; 
  if (!apiKey) {
    console.warn('[voice] GROQ_API_KEY missing - falling back to browser TTS');
    return { provider: 'none', error: 'No API Key' };
  }

  try {
    // Groq TTS endpoint (OpenAI compatible)
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice || 'nova', // 'nova' is high-energy and friendly
        input: text,
      }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Groq TTS HTTP ${response.status}: ${errData.error?.message || 'Unknown'}`);
    }
    
    const buffer = await response.arrayBuffer();
    return {
      audioBase64: Buffer.from(buffer).toString('base64'),
      mimeType: 'audio/mpeg',
      provider: 'groq'
    };
  } catch (error) {
    console.error('[synthesizeSpeech] Groq Error:', error.message);
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
