import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, Sparkles, Brain, Loader2 } from 'lucide-react';
import { UltravoxSession, Role } from 'ultravox-client';
import { getMentorHistory, sendMentorText, createVoiceSession, saveVoiceTranscript, resetMentorHistory } from '../services/mentorApi';
import { Toddler, Explorer, Learner, Achiever } from './landing/characters';
import AnimatedAIOr from './AnimatedAIOr';

function toDataUrl(base64, mimeType = 'audio/mpeg') {
  return `data:${mimeType};base64,${base64}`;
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MentorChatPanel({
  mode = 'general',
  videoId = '',
  title = 'Spark',
  subtitle = 'Ask anything (Hindi/English). I will adapt to your age.',
  compact = false,
  startFresh = false,
}) {
  const [interactionMode, setInteractionMode] = useState('text'); // 'text' | 'voice'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState(null); // 'user' | 'assistant'
  const [lastReward, setLastReward] = useState(null);
  const [learningCheck, setLearningCheck] = useState(false);

  const sessionRef = useRef(null);
  const sessionTurnsRef = useRef([]);
  const listRef = useRef(null);
  const audioRef = useRef(null);

  const childAge = Number(localStorage.getItem('childAge')) || 8;
  const childName = localStorage.getItem('childName') || 'Kid';
  const AiBuddy = childAge <= 5 ? Toddler : childAge <= 8 ? Explorer : childAge <= 12 ? Learner : Achiever;
  const isTeen = childAge > 9;

  useEffect(() => {
    // If switching back to text, leave any active call
    if (interactionMode === 'text' && sessionRef.current) {
      stopRecording();
    }
  }, [interactionMode]);

  const panelMode = useMemo(() => (mode === 'video' ? 'video' : 'general'), [mode]);

  useEffect(() => {
    let cancelled = false;
    setError('');

    const loadHistory = async () => {
      if (startFresh) {
        await resetMentorHistory({ mode: panelMode, videoId });
      }

      return getMentorHistory({ mode: panelMode, videoId, limit: 5 });
    };

    loadHistory()
      .then((payload) => {
        if (cancelled) return;
        const items = Array.isArray(payload.history) ? payload.history : [];
        const mapped = items.map((item) => ({
          id: item._id,
          role: item.role,
          content: item.content,
          at: item.createdAt,
        }));
        setMessages(mapped);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'Could not load conversation history');
      });

    return () => {
      cancelled = true;
    };
  }, [panelMode, videoId, startFresh]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } catch {
        // no-op
      }

      if (sessionRef.current) {
        try {
          sessionRef.current.leaveCall();
        } catch {
          // no-op
        }
      }
    };
  }, []);

  const pushMessage = (role, content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        at: new Date().toISOString(),
      },
    ]);
  };

  const playAudioIfAny = (audio, text) => {
    if (!audio?.base64) {
      return;
    }
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const player = new Audio(toDataUrl(audio.base64, audio.mimeType));
      audioRef.current = player;
      player.onended = () => {};
      player.onerror = () => {};
      if (audio.autoPlay !== false) {
        player.play().catch(() => {
          setError('Audio autoplay was blocked. Tap once and try again.');
        });
      }
    } catch (e) {
      console.error('Audio playback error:', e);
      setError('Voice playback failed.');
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleTextSend = async () => {
    const message = input.trim();
    if (!message || loading) return;

    setLoading(true);
    setError('');
    pushMessage('user', message);
    setInput('');

    try {
      const payload = await sendMentorText({
        message,
        mode: panelMode,
        videoId,
        withVoice: true,
        autoPlay: true,
        learningSignal: learningCheck ? { answeredCorrectly: true } : null,
      });

      const aiBody = payload.text || 'Let us keep exploring!';
      pushMessage('assistant', aiBody);

      // Clear subtitleText to prevent duplication before playing audio
      setSubtitleText('');
      playAudioIfAny(payload.audio, aiBody);

      if (payload.audio?.error) setError(`Voice issue: ${payload.audio.error}`);
      setLastReward(payload.reward || null);
      setLearningCheck(false);
    } catch (e) {
      setError(e.message || 'Reply failed');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (loading || recording) return;
    setLoading(true);
    setError('');

    try {
      const sessionData = await createVoiceSession({ mode: panelMode, videoId });
      if (!sessionData.joinUrl) throw new Error('No joinUrl returned from backend');

      const session = new UltravoxSession();
      sessionRef.current = session;
      sessionTurnsRef.current = [];

      session.addEventListener('status', (event) => {
        if (session.status === 'disconnected') {
          setRecording(false);
          setLoading(false);
          // Auto-save when disconnected
          if (sessionTurnsRef.current.length > 0) {
            saveVoiceTranscript({
              transcript: sessionTurnsRef.current,
              mode: panelMode,
              videoId
            }).catch(console.error);
          }
        }
      });

      let processedIndexes = new Set();

      session.addEventListener('transcripts', (event) => {
        const turns = session.transcripts || [];
        if (turns.length === 0) return;

        // 1. Handle live subtitles (Find the most recent non-final turn)
        const activeTurns = turns.filter(t => !t.isFinal);
        if (activeTurns.length > 0) {
          const latestActive = activeTurns[activeTurns.length - 1];
          const activeRole = String(latestActive.speaker || latestActive.role || '').toLowerCase();
          setCurrentSpeaker(activeRole === 'user' ? 'user' : 'assistant');
          setSubtitleText(latestActive.text);
        } else {
          setSubtitleText('');
        }

        // 2. Handle finalized turns to push as permanent bubbles
        turns.forEach((turn, index) => {
          if (turn.isFinal && !processedIndexes.has(index)) {
            processedIndexes.add(index);
            const turnRole = String(turn.speaker || turn.role || '').toLowerCase();
            const r = turnRole === 'user' ? 'user' : 'assistant';

            pushMessage(r, turn.text);
            sessionTurnsRef.current.push({ role: r, content: turn.text });
          }
        });
      });

      await session.joinCall(sessionData.joinUrl);
      setRecording(true);
    } catch (e) {
      console.error('Voice session failed:', e);
      if (e.message?.includes('Permission denied') || e.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else {
        setError(e.message || 'Voice session failed to start');
      }
      setRecording(false);
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = () => {
    if (sessionRef.current) {
      sessionRef.current.leaveCall();
      setSubtitleText('');
      setCurrentSpeaker(null);
    }
  };

  return (
    <div className={`flex flex-col border rounded-3xl overflow-hidden h-full min-h-0 transition-all duration-300 relative ${isTeen ? 'border-white/[0.06]' : 'border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}
      style={{ background: isTeen ? '#111118' : '#1E1E2A' }}>
      {/* Header with Mode Toggler */}
      <div className={`p-5 border-b backdrop-blur-md z-10 shadow-sm ${isTeen ? 'border-white/[0.06]' : 'border-white/10'}`}
        style={{ background: isTeen ? 'rgba(251,236,107,0.03)' : 'linear-gradient(to right, #1E1E2A, #262635)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${isTeen ? 'border border-[#FBEC6B]/20' : 'bg-gradient-to-br from-[#FF6B6B] to-[#A78BFA] shadow-lg shadow-[#FF6B6B]/20'}`}
              style={isTeen ? { background: 'rgba(251,236,107,0.1)' } : {}}>
              <div className="w-8 h-8"><AiBuddy /></div>
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
                {title}
                <Sparkles className={`w-4 h-4 animate-pulse ${isTeen ? '' : ''}`} style={{ color: isTeen ? '#FBEC6B' : '#FBBF24' }} />
              </h3>
              {!compact && <p className="text-xs text-white/50 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-hidden relative flex flex-col ${compact ? '' : 'md:flex-row'}`}
        style={{ background: isTeen ? 'rgba(10,10,15,0.4)' : 'rgba(14,14,22,0.4)' }}>

        {/* Left Side: Voice Agent Video (Only visible when not compact) */}
        {!compact && (
          <div className={`hidden md:flex w-1/2 border-r flex-col items-center justify-center p-8 relative overflow-hidden group ${isTeen ? 'border-white/[0.06]' : 'border-white/10'}`}
            style={{ background: isTeen ? '#0a0a0f' : '#0E0E16' }}>
            {/* Glowing Background Ring */}
            <div className={`absolute w-[120%] h-[120%] max-w-3xl max-h-3xl blur-[120px] rounded-full pointer-events-none transition-all duration-1000 ${recording ? 'opacity-100 scale-110 animate-pulse' : 'opacity-40 scale-90'}`}
              style={{ background: isTeen ? 'radial-gradient(circle, rgba(251,236,107,0.12) 0%, transparent 70%)' : 'linear-gradient(to top-right, rgba(255,107,107,0.15), rgba(167,139,250,0.15))' }} />

            {/* AI Animation Component */}
            <div className="relative z-10 w-full flex items-center justify-center scale-105">
              <AnimatedAIOr
                isListening={recording && currentSpeaker !== 'assistant'}
                isSpeaking={recording && currentSpeaker === 'assistant'}
                onClick={() => recording ? stopRecording() : startRecording()}
              />
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
              <Brain className="w-3.5 h-3.5" style={{ color: isTeen ? '#FBEC6B' : '#FF6B6B' }} /> Built with Spark AI
            </div>
          </div>
        )}

        {/* Right Side: Unified Chat Display & Action Bar */}
        <div className={`flex-1 min-h-0 flex flex-col relative h-full ${compact ? 'w-full' : 'w-full md:w-1/2'}`}>
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6 no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner border overflow-hidden ${isTeen ? 'border-white/[0.06]' : 'border-white/5'}`}
                style={{ background: isTeen ? 'rgba(251,236,107,0.05)' : '#262635' }}>
                <div className="w-20 h-20"><AiBuddy /></div>
              </div>
              <p className="text-sm text-white/40 max-w-[200px] font-medium leading-relaxed">Ask me anything! Talk to me or type below.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-3xl p-4 text-[15px] shadow-md transition-all duration-300 leading-relaxed font-medium ${m.role === 'user'
                ? isTeen ? 'text-gray-900 rounded-tr-sm' : 'text-white rounded-tr-sm'
                : isTeen ? 'text-white/85 border border-white/[0.06] rounded-tl-sm' : 'bg-[#262635] text-white/90 border border-white/5 rounded-tl-sm'
                }`} style={m.role === 'user' ? (isTeen ? { background: '#FBEC6B' } : { background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }) : (isTeen ? { background: 'rgba(255,255,255,0.04)' } : {})}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && !recording && (
            <div className="flex justify-start">
              <div className={`rounded-full p-3 px-5 border animate-pulse flex items-center gap-3 ${isTeen ? 'border-[#FBEC6B]/20' : 'border-[#FF6B6B]/20'}`}
                style={{ background: isTeen ? 'rgba(251,236,107,0.05)' : 'rgba(255,107,107,0.06)' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: isTeen ? '#FBEC6B' : '#FF6B6B' }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: isTeen ? 'rgba(251,236,107,0.7)' : 'rgba(255,107,107,0.7)' }}>Thinking</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar (Text Input + Voice Trigger) */}
        <div className={`p-4 sm:p-6 border-t flex items-center gap-3 z-10 ${isTeen ? 'border-white/[0.06]' : 'border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]'}`}
          style={{ background: isTeen ? '#111118' : '#1E1E2A' }}>
          {!recording ? (
            <>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleTextSend())}
                placeholder="Ask me something..."
                className={`flex-1 rounded-2xl px-5 py-4 text-[15px] font-medium text-white placeholder:text-white/30 focus:outline-none transition-all shadow-inner ${isTeen
                  ? 'bg-white/[0.03] border border-white/[0.08] focus:border-[#FBEC6B]/30 focus:ring-1 focus:ring-[#FBEC6B]/15'
                  : 'bg-[#0E0E16] border border-white/10 focus:border-[#FF6B6B] focus:ring-1 focus:ring-[#FF6B6B]/30'}`}
              />
              <button
                onClick={handleTextSend}
                disabled={loading || !input.trim()}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 border ${isTeen
                  ? 'border-white/[0.06] bg-white/[0.04] text-white/50 hover:text-gray-900' : 'bg-[#262635] text-white/60 hover:text-white border-white/5'}`}
                style={isTeen ? {} : {}}
                onMouseEnter={(e) => { if (isTeen) { e.currentTarget.style.background = '#FBEC6B'; } else { e.currentTarget.style.background = 'linear-gradient(135deg, #FF6B6B, #A78BFA)'; } }}
                onMouseLeave={(e) => { if (isTeen) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } else { e.currentTarget.style.background = '#262635'; } }}
              >
                <Send className="w-6 h-6" />
              </button>
              <button
                onClick={startRecording}
                disabled={loading}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 group ${isTeen ? '' : 'text-white shadow-lg shadow-[#FF6B6B]/20'}`}
                style={isTeen ? { background: '#FBEC6B', color: '#0a0a0f' } : { background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}
              >
                <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-between border py-3 px-4 rounded-2xl shadow-inner relative overflow-hidden ${isTeen ? 'border-[#FBEC6B]/20' : 'border-[#FF6B6B]/30'}`}
              style={{ background: isTeen ? 'rgba(251,236,107,0.03)' : '#262635' }}>
              {/* Background glowing effect when speaking */}
              <div className={`absolute inset-0 bg-gradient-to-r ${currentSpeaker === 'assistant'
                ? isTeen ? 'animate-pulse' : 'animate-pulse'
                : currentSpeaker === 'user' ? 'from-white/10 to-white/5 animate-pulse' : 'from-transparent to-transparent'} transition-all duration-300 pointer-events-none`}
                style={currentSpeaker === 'assistant' ? (isTeen ? { background: 'linear-gradient(to right, rgba(251,236,107,0.08), rgba(251,236,107,0.03))' } : { background: 'linear-gradient(to right, rgba(255,107,107,0.12), rgba(167,139,250,0.12))' }) : {}} />

              <div className="flex items-center gap-4 w-full z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${currentSpeaker === 'assistant' ? 'animate-bounce' : 'opacity-80 scale-95'} transition-all duration-300 ${isTeen ? 'border border-[#FBEC6B]/20' : ''}`}
                  style={isTeen ? { background: 'rgba(251,236,107,0.1)' } : { background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
                  <div className="w-9 h-9"><AiBuddy /></div>
                </div>

                <div className="flex-1 min-w-0">
                  {subtitleText ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5 block text-white/70">
                        {currentSpeaker === 'user' ? childName : 'Spark'}
                      </span>
                      <p className={`text-sm md:text-base font-bold truncate ${currentSpeaker === 'user' ? 'text-white' : ''}`}
                        style={currentSpeaker !== 'user' ? { color: isTeen ? '#FBEC6B' : '#FF6B6B' } : {}}>
                        {subtitleText}
                        <span className="inline-flex ml-1 w-1 h-1 bg-current rounded-full animate-pulse" />
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: isTeen ? '#FBEC6B' : '#FF6B6B' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: isTeen ? '#FBEC6B' : '#A78BFA' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: isTeen ? '#FBEC6B' : '#38BDF8' }} />
                      </div>
                      <span className="text-[12px] font-black text-white/50 uppercase tracking-widest">Listening...</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={stopRecording}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-rose-500/90 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg z-10"
              >
                <MicOff className="w-4 h-4" /> End
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {error && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-500/90 backdrop-blur-md rounded-full text-xs text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 z-50">
          <Brain className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
