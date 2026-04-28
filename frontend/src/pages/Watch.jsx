import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gift, Brain, Zap, Star, Clock, Eye, ThumbsUp, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from '../components/VideoPlayer';
import FloatingAiAssistant from '../components/ui/floating-ai-assistant';
import BalloonBackground from '../components/ui/balloon-background';
import { Toddler, Explorer, Learner, Achiever } from '../components/landing/characters';

function fmt(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const video = useMemo(() => (
    location.state?.video || {
      id,
      videoId: id,
      title: 'Khoj Video',
      channel: 'Education',
      avatar: 'https://ui-avatars.com/api/?name=Educator&background=random&color=fff',
      views: 'Popular',
      time: 'Recently added',
      accent: 'from-indigo-600 to-sky-500',
      duration: '10:00',
      thumbnail: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&w=800&q=80',
    }
  ), [location.state, id]);
  const childAge = Number(localStorage.getItem('childAge')) || 10;

  const [wowFactors, setWowFactors] = useState([]);
  const [ppuMeta, setPpuMeta] = useState({ source: null, latencyMs: null, cached: false, transcriptStatus: null, aiStatus: null });
  const [ppuError, setPpuError] = useState(null);
  const [unlocks, setUnlocks] = useState([]); // history of opened gifts this session

  // Guard: must be logged in as child
  useEffect(() => {
    if (!localStorage.getItem('childToken')) navigate('/child-auth', { replace: true });
  }, [navigate]);

  // Fetch PPU metadata for the AI Points sidebar (VideoPlayer also fetches its own copy;
  // this duplicate call is near-free because the backend caches for 12h).
  useEffect(() => {
    if (!video?.videoId) return;
    let cancelled = false;
    fetch(`/api/ppu/wow-factors?videoId=${encodeURIComponent(video.videoId)}&age=${childAge}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const err = j?.error || j?.message || `PPU ${r.status}`;
          throw new Error(err);
        }
        return j;
      })
      .then((j) => {
        if (cancelled) return;
        setWowFactors(Array.isArray(j.wowFactors) ? j.wowFactors : []);
        setPpuMeta({
          source: j.source,
          latencyMs: j.latencyMs,
          cached: !!j.cached,
          transcriptStatus: j.transcriptStatus || null,
          aiStatus: j.aiStatus || null,
        });
        setPpuError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setWowFactors([]);
        setPpuError(e?.message || 'Transcript unavailable for this video');
      });
    return () => { cancelled = true; };
  }, [video?.videoId, childAge]);

  const handleGiftUnlocked = useCallback((payload) => {
    setUnlocks((u) => [{ at: Date.now(), ...payload }, ...u].slice(0, 5));
  }, []);

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-xl font-semibold">Video not found</h1>
        <Link to="/video-feed" className="mt-4 text-indigo-300 hover:text-indigo-200 underline underline-offset-4">Back to feed</Link>
      </div>
    );
  }

  const AiBuddy = childAge <= 5 ? Toddler : childAge <= 8 ? Explorer : childAge <= 12 ? Learner : Achiever;
  const isTeen = childAge > 9;

  /* ═══════════════════════════════════════════════════════════════════
     ██  TEEN WATCH UI  —  Dark + #FBEC6B Gold Accent
     ═══════════════════════════════════════════════════════════════════ */
  if (isTeen) {
    return (
      <div className="min-h-screen font-sans text-white relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(251,236,107,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,236,107,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(251,236,107,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06]"
          style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(24px)' }}>
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/video-feed" className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <span className="text-xl font-black tracking-tight" style={{ color: '#FBEC6B' }}>KHOJ</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 hidden sm:block">Age {childAge}</span>
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                <AiBuddy />
              </div>
            </div>
          </div>
        </header>

        {/* Player + Content */}
        <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <VideoPlayer
              videoId={video.videoId}
              age={childAge}
              watchMeta={video}
              ppuEndpoint="/api/ppu/wow-factors"
              onGiftUnlocked={handleGiftUnlocked}
            />
          </motion.div>

          {/* Title + metadata card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 rounded-xl p-5 sm:p-6 border border-white/[0.06]"
            style={{ background: '#111118' }}>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white/95">{video.title}</h1>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={video.avatar} alt={video.channel} className="w-10 h-10 rounded-full ring-1 ring-white/10" />
                <div>
                  <div className="font-semibold text-white/80 text-sm">{video.channel}</div>
                  <div className="text-[11px] text-white/30">{video.views} · {video.time}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider border border-[#FBEC6B]/20"
                  style={{ color: '#FBEC6B', background: 'rgba(251,236,107,0.08)' }}>
                  <Zap className="w-3.5 h-3.5" /> AI-Powered
                </span>
              </div>
            </div>
          </motion.div>

          {/* AI Learning Points (Teen Style) */}
          <TeenAiPointsPanel wowFactors={wowFactors} ppuMeta={ppuMeta} ppuError={ppuError} unlocks={unlocks} />
        </main>

        <FloatingAiAssistant videoId={video.videoId} mode="video" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ██  KID WATCH UI  —  Sensory Stage (age ≤ 9) — UNCHANGED
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen font-sans text-gray-900 relative overflow-x-hidden"
      style={{ background: 'linear-gradient(150deg, #FFEDD5 0%, #FFC9DE 15%, #FCA5F1 30%, #C4B5FD 45%, #93C5FD 60%, #6EE7B7 75%, #FDE68A 90%, #FBBF24 100%)' }}>

      {/* Interactive Balloon Background */}
      <BalloonBackground balloonCount={18} />

      {/* Top bar — glassmorphic */}
      <header className="sticky top-0 z-40 border-b border-white/30"
        style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)' }}>
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/video-feed" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to explore
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#FF6B6B] via-[#A78BFA] to-[#38BDF8] bg-clip-text text-transparent">KHOJ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:block">Age {childAge}</span>
            <div className="w-9 h-9 rounded-2xl bg-white/60 flex items-center justify-center border-2 border-white/50 overflow-hidden shadow-md">
              <div className="w-7 h-7"><AiBuddy /></div>
            </div>
          </div>
        </div>
      </header>

      {/* Full-width Player */}
      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <VideoPlayer
            videoId={video.videoId}
            age={childAge}
            watchMeta={video}
            ppuEndpoint="/api/ppu/wow-factors"
            onGiftUnlocked={handleGiftUnlocked}
          />
        </motion.div>

        {/* Title card — glassmorphic */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 rounded-3xl p-6 sm:p-8 border-2 border-white/40 relative overflow-hidden group"
          style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)' }}
        >
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-gray-800">{video.title}</h1>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <img src={video.avatar} alt={video.channel} className="w-11 h-11 rounded-full ring-2 ring-white/70 shadow-lg" />
              <div>
                <div className="font-bold text-gray-800 text-base">{video.channel}</div>
                <div className="text-[11px] font-bold text-gray-500 mt-0.5">{video.views} · {video.time}</div>
              </div>
              <div className="ml-auto inline-flex items-center gap-2 text-[11px] px-4 py-2 rounded-full border-2 font-black uppercase tracking-widest"
                style={{ background: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(251,191,36,0.12), rgba(167,139,250,0.12))', borderColor: 'rgba(255,107,107,0.3)' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#FBBF24' }} /> <span style={{ color: '#FF6B6B' }}>AI-powered ✨</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Learning Points */}
        <AiPointsPanel wowFactors={wowFactors} ppuMeta={ppuMeta} ppuError={ppuError} unlocks={unlocks} />
      </main>

      {/* Floating Spark AI Assistant (video mode) */}
      <FloatingAiAssistant videoId={video.videoId} mode="video" />
    </div>
  );
}

const KID_POINT_GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B, #FB923C)',
  'linear-gradient(135deg, #A78BFA, #F472B6)',
  'linear-gradient(135deg, #38BDF8, #34D399)',
  'linear-gradient(135deg, #FBBF24, #FF6B6B)',
  'linear-gradient(135deg, #34D399, #38BDF8)',
  'linear-gradient(135deg, #F472B6, #A78BFA)',
  'linear-gradient(135deg, #FB923C, #FBBF24)',
  'linear-gradient(135deg, #38BDF8, #A78BFA)',
];
const KID_TAG_BG = [
  { bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.25)', color: '#FF6B6B' },
  { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', color: '#A78BFA' },
  { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)', color: '#38BDF8' },
  { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', color: '#FBBF24' },
  { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', color: '#34D399' },
  { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)', color: '#F472B6' },
];

function AiPointsPanel({ wowFactors, ppuMeta, ppuError, unlocks }) {
  const EMOJIS = ['⭐', '🌈', '🚀', '🧠', '💡', '🔬', '🎯', '✨'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mt-6 rounded-3xl border-2 border-white/40 p-6 sm:p-8 mb-10"
      style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(251,191,36,0.2))', borderColor: 'rgba(255,107,107,0.3)' }}>
          <Brain className="w-5 h-5" style={{ color: '#FF6B6B' }} />
        </div>
        <h2 className="text-lg font-black tracking-tight text-gray-800">🌈 Learning Points</h2>
      </div>

      {ppuError ? (
        <div className="text-sm font-bold p-4 rounded-2xl border"
          style={{ color: '#FF6B6B', background: 'rgba(255,107,107,0.08)', borderColor: 'rgba(255,107,107,0.2)' }}>
          Oops! {ppuError}
        </div>
      ) : wowFactors.length === 0 ? (
        <div className="text-sm font-medium text-gray-500 bg-white/40 p-4 rounded-2xl border border-white/40 flex items-center gap-3">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
          Getting learning points ready... ✨
        </div>
      ) : (
        <ol className="space-y-3">
          {wowFactors.map((w, i) => {
            const tag = KID_TAG_BG[i % KID_TAG_BG.length];
            return (
              <li key={i} className="rounded-2xl border-2 border-white/40 p-4 flex gap-4 transition-colors group hover:border-[#FF6B6B]/30"
                style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform"
                  style={{ background: KID_POINT_GRADIENTS[i % KID_POINT_GRADIENTS.length] }}>
                  {EMOJIS[i % EMOJIS.length]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span className="font-mono px-2 py-0.5 rounded border"
                      style={{ color: tag.color, background: tag.bg, borderColor: tag.border }}>{fmt(w.timestamp)}</span>
                    <span className="inline-flex items-center gap-1" style={{ color: '#FF6B6B' }}>
                      <Sparkles className="w-3 h-3" /> Wow!
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] font-semibold leading-relaxed text-gray-800">{w.fact}</p>
                  {w.bridgeConcept && (
                    <p className="mt-2 text-[13px] text-gray-600 flex items-start gap-2 p-3 rounded-xl border"
                      style={{ background: 'rgba(255,107,107,0.06)', borderColor: 'rgba(255,107,107,0.15)' }}>
                      <Gift className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#FBBF24' }} />
                      <span className="font-medium">{w.bridgeConcept}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {unlocks.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/30">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-black uppercase tracking-widest" style={{ color: '#FF6B6B' }}>
            <Gift className="w-4 h-4" /> Gifts opened 🎁
          </div>
          <div className="flex flex-wrap gap-2">
            {unlocks.map((u, i) => {
              const tag = KID_TAG_BG[i % KID_TAG_BG.length];
              return (
                <span key={i} className="text-[11px] font-bold px-3 py-1.5 rounded-full border"
                  style={{ color: tag.color, background: tag.bg, borderColor: tag.border }}>
                  🎁 @ {fmt(u.sourceTimestamp || 0)}{u.bridgeConcept ? ` — ${u.bridgeConcept.slice(0, 40)}…` : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   ██  TEEN AI POINTS PANEL  —  Dark Theme
   ═══════════════════════════════════════════════════════════════════ */
function TeenAiPointsPanel({ wowFactors, ppuMeta, ppuError, unlocks }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-5 rounded-xl border border-white/[0.06] p-5 sm:p-6 mb-10"
      style={{ background: '#111118' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#FBEC6B]/20"
          style={{ background: 'rgba(251,236,107,0.08)' }}>
          <Brain className="w-4.5 h-4.5" style={{ color: '#FBEC6B' }} />
        </div>
        <h2 className="text-base font-bold text-white/90">Learning Points</h2>
        {ppuMeta?.source && (
          <span className="text-[9px] font-mono text-white/20 ml-auto uppercase">{ppuMeta.source} · {ppuMeta.latencyMs}ms</span>
        )}
      </div>

      {ppuError ? (
        <div className="text-sm font-medium p-4 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400">
          {ppuError}
        </div>
      ) : wowFactors.length === 0 ? (
        <div className="text-sm font-medium text-white/30 p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#FBEC6B] border-t-transparent rounded-full animate-spin" />
          Analyzing video content…
        </div>
      ) : (
        <ol className="space-y-3">
          {wowFactors.map((w, i) => (
            <li key={i} className="rounded-xl border border-white/[0.06] p-4 flex gap-4 hover:border-[#FBEC6B]/20 transition-colors group"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black group-hover:scale-105 transition-transform"
                style={{ background: 'rgba(251,236,107,0.1)', color: '#FBEC6B', border: '1px solid rgba(251,236,107,0.15)' }}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/25">
                  <span className="font-mono px-1.5 py-0.5 rounded text-[9px]" style={{ color: '#FBEC6B', background: 'rgba(251,236,107,0.08)', border: '1px solid rgba(251,236,107,0.12)' }}>
                    {fmt(w.timestamp)}
                  </span>
                  <span className="inline-flex items-center gap-1" style={{ color: '#FBEC6B' }}>
                    <Sparkles className="w-3 h-3" /> Insight
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/80">{w.fact}</p>
                {w.bridgeConcept && (
                  <p className="mt-2 text-[12px] text-white/40 flex items-start gap-2 p-3 rounded-lg border border-white/[0.06]"
                    style={{ background: 'rgba(251,236,107,0.03)' }}>
                    <Gift className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#FBEC6B' }} />
                    <span>{w.bridgeConcept}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {unlocks.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FBEC6B' }}>
            <Gift className="w-3.5 h-3.5" /> Discoveries unlocked
          </div>
          <div className="flex flex-wrap gap-2">
            {unlocks.map((u, i) => (
              <span key={i} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-[#FBEC6B]/15 text-white/50"
                style={{ background: 'rgba(251,236,107,0.05)' }}>
                🎁 @ {fmt(u.sourceTimestamp || 0)}{u.bridgeConcept ? ` — ${u.bridgeConcept.slice(0, 40)}…` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}