import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Bot, X, Sparkles, Volume2 } from 'lucide-react';
import { UltravoxSession } from 'ultravox-client';
import { sendMentorText, createVoiceSession, saveVoiceTranscript } from '../../services/mentorApi';

function toDataUrl(base64, mimeType = 'audio/mpeg') {
  return `data:${mimeType};base64,${base64}`;
}

export default function FloatingAiAssistant({ videoId = '', mode = 'general' }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [error, setError] = useState('');

  const chatRef = useRef(null);
  const listRef = useRef(null);
  const sessionRef = useRef(null);
  const sessionTurnsRef = useRef([]);
  const audioRef = useRef(null);

  const childName = localStorage.getItem('childName') || 'Kid';
  const childAge = Number(localStorage.getItem('childAge')) || 10;
  const isTeen = childAge > 9;

  // scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, subtitleText]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (chatRef.current && !chatRef.current.contains(e.target) && !e.target.closest('.spark-fab')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try { audioRef.current?.pause(); } catch {}
      try { sessionRef.current?.leaveCall(); } catch {}
    };
  }, []);

  const pushMsg = (role, content) =>
    setMessages((p) => [...p, { id: `${Date.now()}-${Math.random()}`, role, content, at: new Date().toISOString() }]);

  const playAudioIfAny = (audio) => {
    if (!audio?.base64) return;
    try {
      audioRef.current?.pause();
      const player = new Audio(toDataUrl(audio.base64, audio.mimeType));
      audioRef.current = player;
      if (audio.autoPlay !== false) player.play().catch(() => {});
    } catch {}
  };

  // ── Text send (with voice reply) ──
  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;
    pushMsg('user', text);
    setMessage('');
    setLoading(true);
    setError('');
    try {
      const res = await sendMentorText({ message: text, mode, videoId, withVoice: true, autoPlay: true });
      pushMsg('assistant', res.text || 'Let me think about that…');
      playAudioIfAny(res.audio);
    } catch {
      pushMsg('assistant', 'Oops, something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  // ── Voice-to-voice via Ultravox ──
  const startVoiceSession = async () => {
    if (loading || recording) return;
    setLoading(true);
    setError('');
    try {
      const sessionData = await createVoiceSession({ mode, videoId });
      if (!sessionData.joinUrl) throw new Error('No joinUrl');

      const session = new UltravoxSession();
      sessionRef.current = session;
      sessionTurnsRef.current = [];

      session.addEventListener('status', () => {
        if (session.status === 'disconnected') {
          setRecording(false);
          setLoading(false);
          setSubtitleText('');
          setCurrentSpeaker(null);
          if (sessionTurnsRef.current.length > 0) {
            saveVoiceTranscript({ transcript: sessionTurnsRef.current, mode, videoId }).catch(console.error);
          }
        }
      });

      const processedIndexes = new Set();
      session.addEventListener('transcripts', () => {
        const turns = session.transcripts || [];
        if (!turns.length) return;
        const active = turns.filter(t => !t.isFinal);
        if (active.length > 0) {
          const latest = active[active.length - 1];
          const role = String(latest.speaker || latest.role || '').toLowerCase();
          setCurrentSpeaker(role === 'user' ? 'user' : 'assistant');
          setSubtitleText(latest.text);
        } else {
          setSubtitleText('');
        }
        turns.forEach((turn, idx) => {
          if (turn.isFinal && !processedIndexes.has(idx)) {
            processedIndexes.add(idx);
            const r = String(turn.speaker || turn.role || '').toLowerCase() === 'user' ? 'user' : 'assistant';
            pushMsg(r, turn.text);
            sessionTurnsRef.current.push({ role: r, content: turn.text });
          }
        });
      });

      await session.joinCall(sessionData.joinUrl);
      setRecording(true);
    } catch (e) {
      setError(e.message || 'Voice session failed');
      setRecording(false);
    } finally {
      setLoading(false);
    }
  };

  const stopVoiceSession = () => {
    if (sessionRef.current) {
      sessionRef.current.leaveCall();
      setSubtitleText('');
      setCurrentSpeaker(null);
    }
  };

  return (
    <div className="fixed bottom-[6.5rem] right-6 z-50">
      {/* Hover tooltip */}
      {hover && !open && (
        <div className={`absolute bottom-20 right-0 whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl border animate-bounce ${isTeen ? 'text-gray-900 border-[#FBEC6B]/40' : 'text-white border-white/30'}`}
          style={{ background: isTeen ? '#FBEC6B' : 'linear-gradient(135deg, #FF6B6B, #A78BFA, #38BDF8)', backdropFilter: 'blur(10px)' }}>
          {isTeen ? 'Ask Spark anything ⚡' : 'Ask me anything, I am your friend! 🤗'}
          <div className="absolute -bottom-2 right-6 w-4 h-4 rotate-45" style={{ background: isTeen ? '#FBEC6B' : '#A78BFA' }} />
        </div>
      )}

      {/* FAB button */}
      <button
        className="spark-fab relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-110"
        onClick={() => { setOpen(!open); setHover(false); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: isTeen ? '#FBEC6B' : 'linear-gradient(135deg, #FF6B6B 0%, #A78BFA 50%, #38BDF8 100%)',
          boxShadow: isTeen
            ? '0 0 20px rgba(251,236,107,0.5), 0 0 40px rgba(251,236,107,0.2)'
            : '0 0 20px rgba(167,139,250,0.7), 0 0 40px rgba(255,107,107,0.4), 0 0 60px rgba(56,189,248,0.3)',
          border: isTeen ? '2px solid rgba(251,236,107,0.6)' : '3px solid rgba(255,255,255,0.5)',
        }}
      >
        {!isTeen && <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent" />}
        <div className="relative z-10">
          {open ? <X className={`w-7 h-7 ${isTeen ? 'text-gray-900' : 'text-white'}`} /> : <Sparkles className={`w-8 h-8 ${isTeen ? 'text-gray-900' : 'text-white'}`} />}
        </div>
        {!open && <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isTeen ? 'bg-[#FBEC6B]' : 'bg-violet-400'}`} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div ref={chatRef} className="absolute bottom-20 right-0 w-[340px] sm:w-[380px] transition-all duration-300 origin-bottom-right"
          style={{ animation: 'sparkPopIn .3s cubic-bezier(.175,.885,.32,1.275) forwards' }}>
          <div className={`flex flex-col rounded-3xl overflow-hidden shadow-2xl ${isTeen ? 'border border-white/[0.08]' : 'border-2 border-white/40'}`}
            style={{ background: isTeen ? 'rgba(17,17,24,0.97)' : 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(255,237,213,0.8), rgba(196,181,253,0.7))', backdropFilter: 'blur(24px)' }}>

            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3 ${isTeen ? 'border-b border-white/[0.08]' : 'border-b border-white/30'}`}
              style={{ background: isTeen ? 'rgba(251,236,107,0.06)' : 'linear-gradient(135deg, rgba(255,107,107,0.3), rgba(167,139,250,0.3), rgba(56,189,248,0.3))' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: isTeen ? '#FBEC6B' : 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
                  <Sparkles className={`w-4 h-4 ${isTeen ? 'text-gray-900' : 'text-white'}`} />
                </div>
                <div>
                  <span className={`text-sm font-extrabold ${isTeen ? 'text-white/90' : 'text-gray-800'}`}>Spark AI</span>
                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className={`text-[10px] font-medium ${isTeen ? 'text-white/40' : 'text-gray-500'}`}>Online</span></div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className={`p-1.5 rounded-full transition-colors ${isTeen ? 'hover:bg-white/10' : 'hover:bg-white/40'}`}>
                <X className={`w-4 h-4 ${isTeen ? 'text-white/50' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{ background: isTeen ? 'rgba(251,236,107,0.1)' : 'linear-gradient(135deg, #FF6B6B, #A78BFA, #38BDF8)' }}>
                    <Bot className={`w-8 h-8 ${isTeen ? '' : 'text-white'}`} style={isTeen ? { color: '#FBEC6B' } : {}} />
                  </div>
                  <p className={`text-sm font-bold ${isTeen ? 'text-white/80' : 'text-gray-700'}`}>{isTeen ? 'Hey! I\'m Spark ⚡' : 'Hi there! I\'m Spark 🌟'}</p>
                  <p className={`text-xs mt-1 ${isTeen ? 'text-white/40' : 'text-gray-500'}`}>Ask me anything or tap the mic!</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-md ${
                    m.role === 'user'
                      ? isTeen ? 'text-gray-900 rounded-br-md' : 'bg-gradient-to-r from-[#FF6B6B] to-[#A78BFA] text-white rounded-br-md'
                      : isTeen ? 'bg-white/[0.06] text-white/80 border border-white/[0.08] rounded-bl-md' : 'bg-white/70 text-gray-800 border border-white/50 rounded-bl-md'
                  }`} style={m.role === 'user' && isTeen ? { background: '#FBEC6B' } : {}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && !recording && (
                <div className="flex justify-start"><div className={`px-4 py-3 rounded-2xl rounded-bl-md flex gap-1 ${isTeen ? 'bg-white/[0.06] border border-white/[0.08]' : 'bg-white/70 border border-white/50'}`}>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: isTeen ? '#FBEC6B' : '#a78bfa' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: isTeen ? '#FBEC6B' : '#f472b6' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: isTeen ? '#FBEC6B' : '#38bdf8' }} />
                </div></div>
              )}
            </div>

            {/* Live subtitle during voice session */}
            {recording && subtitleText && (
              <div className={`px-4 py-2 border-t ${isTeen ? 'border-white/[0.08]' : 'border-white/20'}`} style={{ background: isTeen ? 'rgba(251,236,107,0.05)' : 'rgba(167,139,250,0.1)' }}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isTeen ? 'text-white/40' : 'text-gray-500'}`}>
                  {currentSpeaker === 'user' ? childName : 'Spark'}
                </span>
                <p className={`text-xs font-bold truncate ${currentSpeaker === 'user' ? (isTeen ? 'text-white' : 'text-gray-800') : (isTeen ? '' : 'text-violet-700')}`}
                  style={currentSpeaker !== 'user' && isTeen ? { color: '#FBEC6B' } : {}}>
                  {subtitleText}
                  <span className="inline-flex ml-1 w-1 h-1 bg-current rounded-full animate-pulse" />
                </p>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className={`px-4 py-2 text-xs font-bold text-center ${isTeen ? 'bg-red-500/10 border-t border-red-500/20 text-red-400' : 'bg-red-100 border-t border-red-200 text-red-600'}`}>
                {error}
              </div>
            )}

            {/* Action bar */}
            <div className={`px-3 pb-3 pt-2 border-t ${isTeen ? 'border-white/[0.08]' : 'border-white/30'}`}>
              {!recording ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium focus:outline-none transition-all ${isTeen
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:border-[#FBEC6B]/40 focus:ring-1 focus:ring-[#FBEC6B]/20'
                      : 'bg-white/50 border border-white/40 text-gray-800 placeholder:text-gray-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-300'}`}
                  />
                  <button onClick={handleSend} disabled={loading || !message.trim()}
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40"
                    style={{ background: isTeen ? '#FBEC6B' : 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
                    <Send className={`w-4 h-4 ${isTeen ? 'text-gray-900' : 'text-white'}`} />
                  </button>
                  <button onClick={startVoiceSession} disabled={loading}
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 ${isTeen
                      ? 'border border-white/10 bg-white/[0.05] hover:bg-[#FBEC6B]/10 hover:border-[#FBEC6B]/30'
                      : 'border-2 border-white/40 bg-white/50 hover:bg-emerald-100 hover:border-emerald-400'}`}
                    title="Tap to Speak">
                    <Volume2 className={`w-4 h-4 ${isTeen ? '' : 'text-emerald-600'}`} style={isTeen ? { color: '#FBEC6B' } : {}} />
                  </button>
                </div>
              ) : (
                <div className={`flex items-center gap-2 rounded-full px-3 py-2 ${isTeen ? 'border border-[#FBEC6B]/20' : 'bg-violet-100/60 border border-violet-300/50'}`}
                  style={isTeen ? { background: 'rgba(251,236,107,0.06)' } : {}}>
                  <div className="flex gap-1 shrink-0">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: isTeen ? '#FBEC6B' : '#8b5cf6' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: isTeen ? '#FBEC6B' : '#ec4899' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: isTeen ? '#FBEC6B' : '#8b5cf6' }} />
                  </div>
                  <span className={`flex-1 text-xs font-bold truncate ${isTeen ? 'text-white/60' : 'text-violet-700'}`}>
                    {subtitleText || 'Listening…'}
                  </span>
                  <button onClick={stopVoiceSession}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-black uppercase rounded-full transition-all shadow-md">
                    <MicOff className="w-3 h-3" /> End
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sparkPopIn {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
