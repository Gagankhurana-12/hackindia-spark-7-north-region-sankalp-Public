const { buildMentorReply, getRecentConversation, prepareVoiceContext, resetConversation } = require('../services/mentorService');
const { transcribeAudio, synthesizeSpeech, createVoiceCall } = require('../services/voiceService');
const ConversationTurn = require('../models/ConversationTurn');

function cleanMode(mode) {
  return mode === 'video' ? 'video' : 'general';
}

exports.startVoiceSession = async (req, res) => {
  try {
    const childId = req.child?._id;
    if (!childId) return res.status(401).json({ message: 'Child authentication required' });

    const { videoId, mode } = req.query;

    const { systemPrompt, initialMessage } = await prepareVoiceContext({
      childId,
      videoId,
      mode: mode || 'general',
    });

    const call = await createVoiceCall({
      systemPrompt,
      initialMessage,
    });

    return res.json({
      message: 'ok',
      joinUrl: call.joinUrl,
      callId: call.callId,
      provider: call.provider,
    });
  } catch (error) {
    console.error('[startVoiceSession]', error);
    return res.status(500).json({ message: error.message || 'Failed to start voice session' });
  }
};

exports.saveVoiceTranscript = async (req, res) => {
  try {
    const childId = req.child?._id;
    const { transcript, videoId, mode } = req.body;

    if (!Array.isArray(transcript)) {
      return res.status(400).json({ message: 'transcript array is required' });
    }

    // Convert Ultravox transcript format to our ConversationTurn format
    const turns = transcript.map(t => ({
      childId,
      role: t.role === 'user' ? 'user' : 'assistant',
      content: t.content,
      mode: mode || 'general',
      videoId: videoId || '',
      source: 'voice'
    }));

    if (turns.length > 0) {
      await ConversationTurn.insertMany(turns);
    }

    return res.json({ message: 'ok', savedCount: turns.length });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save transcript' });
  }
};

exports.chatWithMentor = async (req, res) => {
  try {
    const childId = req.child?._id;
    if (!childId) return res.status(401).json({ message: 'Child authentication required' });

    const {
      message,
      mode,
      videoId,
      language,
      learningSignal,
      audioBase64,
      audioMimeType,
      voice,
    } = req.body || {};

    let userQuestion = String(message || '').trim();
    let usedVoiceInput = false;

    if (!userQuestion && audioBase64) {
      try {
        const stt = await transcribeAudio({
          audioBase64,
          mimeType: audioMimeType || 'audio/webm',
          language: language || 'en',
        });
        userQuestion = stt.text;
        usedVoiceInput = true;
      } catch (error) {
        return res.status(error.status || 400).json({
          message: error.message || 'Voice transcription failed',
          source: 'stt',
        });
      }
    }

    if (!userQuestion) {
      return res.status(400).json({ message: 'message or audioBase64 is required' });
    }

    const mentor = await buildMentorReply({
      childId,
      userQuestion,
      mode: cleanMode(mode),
      videoId: String(videoId || ''),
      inputSource: usedVoiceInput ? 'voice' : 'text',
      preferredLanguage: language || 'en',
      learningSignal,
    });

    let audio = null;
    if (voice?.enabled) {
      try {
        const tts = await synthesizeSpeech({
          text: mentor.text,
          language: language || 'en',
          voice: voice.voice || 'alloy',
        });
        audio = {
          base64: tts.audioBase64,
          mimeType: tts.mimeType,
          provider: tts.provider,
          autoPlay: voice.autoPlay !== false,
        };
      } catch (error) {
        audio = {
          error: error.message,
          autoPlay: false,
          provider: 'ultravox',
        };
      }
    }

    return res.json({
      message: 'ok',
      transcript: usedVoiceInput ? userQuestion : null,
      text: mentor.text,
      subtitles: mentor.text,
      audio,
      context: mentor.context,
      learningMemory: mentor.memory,
      reward: mentor.reward,
      provider: mentor.provider,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Mentor chat failed' });
  }
};

exports.getConversationHistory = async (req, res) => {
  try {
    const childId = req.child?._id;
    if (!childId) return res.status(401).json({ message: 'Child authentication required' });

    const mode = cleanMode(req.query.mode);
    const videoId = String(req.query.videoId || '');
    const limit = Number(req.query.limit) || 5;

    const history = await getRecentConversation({ childId, mode, videoId, limit });
    return res.json({
      message: 'ok',
      count: history.length,
      history,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load conversation history' });
  }
};

exports.resetConversationHistory = async (req, res) => {
  try {
    const childId = req.child?._id;
    if (!childId) return res.status(401).json({ message: 'Child authentication required' });

    const mode = cleanMode(req.body?.mode || req.query?.mode);
    const videoId = String(req.body?.videoId || req.query?.videoId || '');

    const deletedCount = await resetConversation({ childId, mode, videoId });
    return res.json({
      message: 'ok',
      deletedCount,
      mode,
      videoId: videoId || null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to reset conversation history' });
  }
};

exports.synthesizeText = async (req, res) => {
  try {
    const { text, language, voice } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    const tts = await synthesizeSpeech({
      text,
      language: language || 'en',
      voice: voice || 'alloy',
    });

    return res.json(tts);
  } catch (error) {
    console.error('[synthesizeText]', error);
    return res.status(500).json({ message: error.message || 'TTS failed' });
  }
};
