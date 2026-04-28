import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Gift, Sparkles, SkipForward, Volume2 } from 'lucide-react';

// --------------------------------------------------------------- age bands
function resolveBand(ageOrGroup) {
  if (typeof ageOrGroup === 'string') return ageOrGroup;
  const a = Number(ageOrGroup) || 10;
  if (a <= 5) return 'sensory';
  if (a <= 12) return 'functional';
  return 'specialist';
}

const MENTORS = {
  sensory: {
    name: 'Bubbles',
    glyph: '☁️',
    image: '/mentor-sensory.png',
    ring: 'from-pink-300 via-sky-200 to-violet-300',
    dot: 'bg-pink-400',
    panel: 'bg-gradient-to-br from-pink-50 to-sky-50 text-slate-800',
    greeting: 'Guess what? I just saw something amazing!',
  },
  functional: {
    name: 'Z-1',
    glyph: '🤖',
    image: '/mentor-functional.png',
    ring: 'from-cyan-400 via-indigo-500 to-fuchsia-500',
    dot: 'bg-cyan-400',
    panel: 'bg-gradient-to-br from-indigo-50 to-cyan-50 text-slate-900',
    greeting: 'Keep an eye out! Wait until you hear this...',
  },
  specialist: {
    name: 'The Architect',
    glyph: '◈',
    image: '/mentor-specialist.png',
    ring: 'from-slate-700 via-indigo-700 to-cyan-500',
    dot: 'bg-indigo-400',
    panel: 'bg-gradient-to-br from-slate-900 to-indigo-900 text-slate-100',
    greeting: 'Check this out, this is actually really wild...',
  },
};

// Renders the mentor character. Tries /mentor-{band}.png first;
// falls back to the emoji glyph if the image is missing.
function MentorAvatar({ mentor, size = 'md', speaking = false }) {
  const [imgOk, setImgOk] = useState(true);
  const sz = size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32 text-5xl sm:text-6xl'
    : size === 'md' ? 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl'
      : 'w-12 h-12 text-2xl';
  return (
    <div className={`relative rounded-full bg-linear-to-br ${mentor.ring} flex items-center justify-center overflow-hidden shadow-lg ${sz} ${speaking ? 'gf-float' : ''}`}>
      {imgOk ? (
        <img
          src={mentor.image}
          alt={mentor.name}
          onError={() => setImgOk(false)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{mentor.glyph}</span>
      )}
      {speaking && <span className="absolute inset-0 rounded-full ring-4 ring-white/40 animate-ping" />}
    </div>
  );
}

// Format seconds → MM:SS
function fmtTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// --------------------------------------------------------- PPU loader (Thread B output)
async function loadWowFactors({ videoId, ppuEndpoint, signal }) {
  const sep = ppuEndpoint.includes('?') ? '&' : '?';
  const r = await fetch(`${ppuEndpoint}${sep}videoId=${encodeURIComponent(videoId)}`, { signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j?.error || j?.message || `PPU ${r.status}`);
  }
  return j;
}

// -------------------------------------------------------- YouTube IFrame API singleton
let ytApiPromise = null;
function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

// ----------------------------------------------------------------- TTS (Thread B output)
async function speak(text, { onEnd, childToken, voice = 'alloy', band = 'functional' } = {}) {
  const tryBrowserTTS = (reason) => {
    console.log(`[voice] FALLBACK to browser TTS: ${reason}`);
    try {
      const synth = window.speechSynthesis;
      if (!synth) { if (onEnd) onEnd(); return () => { }; }
      synth.cancel();
      
      const u = new SpeechSynthesisUtterance(text);
      
      // Auto-pick the "best" available local voice (preferring Natural/Google voices)
      const voices = synth.getVoices();
      const bestVoice = voices.find(v => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium')) 
                     || voices.find(v => v.lang.startsWith('en'))
                     || voices[0];
      
      if (bestVoice) u.voice = bestVoice;
      
      // Fine-tune pitch/rate for the specific mentor persona
      if (band === 'sensory') { u.pitch = 1.3; u.rate = 0.9; }
      else if (band === 'functional') { u.pitch = 1.1; u.rate = 1.0; }
      else { u.pitch = 0.9; u.rate = 1.0; }

      u.onend = onEnd; u.onerror = onEnd;
      synth.speak(u);
      return () => synth.cancel();
    } catch {
      if (onEnd) onEnd();
      return () => { };
    }
  };

  try {
    if (!childToken) return tryBrowserTTS();

    const res = await fetch('/api/mentor/synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${childToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, voice })
    });

    const data = await res.json();
    if (!res.ok || !data.audioBase64 || data.provider === 'none') {
      return tryBrowserTTS(data.error || 'Server rejected synthesis');
    }

    console.log(`[voice] PLAYING via ${data.provider} (${voice})`);
    const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
    audio.onended = onEnd;
    audio.play();

    return () => {
      audio.pause();
      audio.src = '';
    };
  } catch (err) {
    return tryBrowserTTS();
  }
}

// ================================================================== Main Component
export default function VideoPlayer({
  videoId,
  age = 10,
  ageGroup,
  watchMeta = null,
  wowFactors: wowFactorsProp = null,
  ppuEndpoint = null,
  onGiftUnlocked,
  onClose,
}) {
  const band = resolveBand(ageGroup ?? age);
  const mentor = MENTORS[band];

  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const triggered = useRef(new Set());
  const cancelSpeakRef = useRef(() => { });

  const [ready, setReady] = useState(false);
  const [wowFactors, setWowFactors] = useState(wowFactorsProp || []);
  const [phase, setPhase] = useState('idle'); // idle | mentor | gift | unlocked
  const [activeWow, setActiveWow] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ppuStatus, setPpuStatus] = useState('loading'); // loading | ready | empty | error
  const [ppuError, setPpuError] = useState(null);
  const [ppuBadges, setPpuBadges] = useState({ transcriptStatus: null, aiStatus: null });
  const [resumeTime, setResumeTime] = useState(0);

  // 1) Thread A — mount the IFrame stream
  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then((YT) => {
      if (destroyed || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: { autoplay: 0, modestbranding: 1, rel: 0, playsinline: 1 },
        events: { onReady: () => setReady(true) },
      });
    }).catch(() => { });
    return () => {
      destroyed = true;
      if (pollRef.current) clearInterval(pollRef.current);
      try { playerRef.current && playerRef.current.destroy && playerRef.current.destroy(); } catch { }
    };
  }, [videoId]);

  // 2) Thread B — pull Wow Factors from the PPU (or accept them as a prop)
  useEffect(() => {
    if (wowFactorsProp && wowFactorsProp.length) {
      setWowFactors(wowFactorsProp); setPpuStatus('ready'); setPpuError(null); setPpuBadges({ transcriptStatus: 'tick', aiStatus: 'tick' }); return;
    }
    if (!ppuEndpoint) { setPpuStatus('ready'); setPpuError(null); setPpuBadges({ transcriptStatus: null, aiStatus: null }); return; }
    setPpuStatus('loading');
    setPpuError(null);
    const ctrl = new AbortController();
    loadWowFactors({ videoId, ppuEndpoint, signal: ctrl.signal })
      .then((j) => {
        const wf = Array.isArray(j?.wowFactors) ? j.wowFactors : [];
        setWowFactors(wf);
        setPpuBadges({ transcriptStatus: j?.transcriptStatus || null, aiStatus: j?.aiStatus || null });
        if (j?.aiStatus === 'cancelled') {
          setPpuStatus('cancelled');
        } else {
          setPpuStatus(wf.length ? 'ready' : 'empty');
        }
        setPpuError(null);
      })
      .catch((e) => { setPpuStatus('error'); setPpuError(e?.message || 'PPU failed'); });
    return () => ctrl.abort();
  }, [videoId, ppuEndpoint, wowFactorsProp]);

  // 3) Resume playback from the last saved timestamp
  useEffect(() => {
    if (!ready || !videoId) return;

    const childToken = localStorage.getItem('childToken');
    const player = playerRef.current;
    if (!player) return;

    let cancelled = false;

    const startPlayback = (time = 0) => {
      if (cancelled || !playerRef.current) return;
      try {
        if (Number(time) > 0) {
          playerRef.current.seekTo(Number(time), true);
        }
        playerRef.current.playVideo();
      } catch {
        try { playerRef.current.playVideo(); } catch { }
      }
    };

    if (!childToken) {
      startPlayback(0);
      return () => { cancelled = true; };
    }

    fetch(`/api/watch/resume/${encodeURIComponent(videoId)}`, {
      headers: {
        Authorization: `Bearer ${childToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const time = Number(payload?.resumeTime) || 0;
        setResumeTime(time);
        startPlayback(time);
      })
      .catch(() => startPlayback(0));

    return () => {
      cancelled = true;
    };
  }, [ready, videoId]);

  // 3) Poll currentTime + duration; trigger Pause-and-Speak at each Wow Factor
  useEffect(() => {
    if (!ready) return;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      const t = p.getCurrentTime();
      const d = p.getDuration ? p.getDuration() : 0;
      setCurrentTime(t);
      if (d && d !== duration) setDuration(d);
      if (phase !== 'idle' || !wowFactors.length) return;
      const due = wowFactors.find(
        (w) => !triggered.current.has(w.timestamp) && t >= w.timestamp && t < w.timestamp + 1.5,
      );
      if (due) {
        triggered.current.add(due.timestamp);
        try { p.pauseVideo && p.pauseVideo(); } catch { }
        setActiveWow(due);
        setPhase('mentor');
      }
    }, 400);
    return () => clearInterval(pollRef.current);
  }, [ready, phase, wowFactors]);

  // 4) When the Mentor appears, deliver the fact via TTS
  useEffect(() => {
    if (phase !== 'mentor' || !activeWow) return;
    setSpeaking(true);
    
    // Voices mapping: Alloy is the warmest, most 'parent-like' voice.
    const voiceMap = { sensory: 'alloy', functional: 'alloy', specialist: 'alloy' };
    const childToken = localStorage.getItem('childToken');

    const run = async () => {
      const cancel = await speak(`${mentor.greeting} ${activeWow.fact}`, {
        childToken,
        voice: voiceMap[band] || 'alloy',
        band,
        onEnd: () => setSpeaking(false),
      });
      cancelSpeakRef.current = cancel;
    };

    run();
    return () => cancelSpeakRef.current();
  }, [phase, activeWow, band, mentor.greeting]);

  const handleSkip = useCallback(() => {
    cancelSpeakRef.current();
    setSpeaking(false);
    setPhase('idle');
    setActiveWow(null);
    try { playerRef.current && playerRef.current.playVideo && playerRef.current.playVideo(); } catch { }
  }, []);

  const handleContinue = useCallback(() => {
    cancelSpeakRef.current();
    setSpeaking(false);
    setPhase('gift');
  }, []);

  const handleOpenGift = useCallback(async () => {
    setPhase('unlocked');

    // Save to backend
    const childToken = localStorage.getItem('childToken');
    if (childToken && activeWow) {
      try {
        await fetch('/api/gifts/unbox', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${childToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoId,
            videoTitle: watchMeta?.title || 'A cool video',
            fact: activeWow.fact,
            relatableThing: activeWow.relatableThing,
            giftType: activeWow.giftType,
            bridgeSearchQuery: activeWow.bridgeSearchQuery
          })
        });
      } catch (err) {
        console.warn('Failed to save gift:', err);
      }
    }

    if (onGiftUnlocked) onGiftUnlocked({
      bridgeConcept: activeWow?.bridgeConcept,
      unlockedVideo: activeWow?.unlockedVideo,
      sourceTimestamp: activeWow?.timestamp,
    });
  }, [activeWow, onGiftUnlocked, videoId, watchMeta]);

  const handleResume = useCallback(() => {
    setPhase('idle');
    setActiveWow(null);
    try { playerRef.current && playerRef.current.playVideo && playerRef.current.playVideo(); } catch { }
  }, []);

  // 5) Thread C — Track watch progress to backend
  useEffect(() => {
    if (!ready || !videoId) return;

    const childToken = localStorage.getItem('childToken');
    if (!childToken) return; // Only track if child is logged in

    // Track progress every 15 seconds
    const trackInterval = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;

      const currentSecs = p.getCurrentTime();
      const totalSecs = p.getDuration ? p.getDuration() : 0;
      const completionPercent = totalSecs > 0 ? Math.min(100, (currentSecs / totalSecs) * 100) : 0;

      // Send tracking data to backend
      fetch('/api/watch/track', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${childToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          completion: Math.round(completionPercent),
          lastWatchedTime: Math.floor(currentSecs),
          videoTitle: watchMeta?.title || '',
          videoThumbnail: watchMeta?.thumbnail || '',
          videoChannel: watchMeta?.channel || '',
          videoDuration: watchMeta?.duration || '',
          videoTopic: watchMeta?.topic || watchMeta?.category || ''
        })
      }).catch(err => console.warn('Watch tracking failed:', err));
    }, 15000);

    return () => clearInterval(trackInterval);
  }, [ready, videoId]);

  // 6) Track final progress before closing
  useEffect(() => {
    return () => {
      // Track final progress when component unmounts
      const childToken = localStorage.getItem('childToken');
      if (!childToken || !videoId) return;

      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;

      const currentSecs = p.getCurrentTime();
      const totalSecs = p.getDuration ? p.getDuration() : 0;
      const completionPercent = totalSecs > 0 ? Math.min(100, (currentSecs / totalSecs) * 100) : 0;

      // Send final tracking data with keepalive flag to ensure it completes even if page unloads
      fetch('/api/watch/track', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${childToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          completion: Math.round(completionPercent),
          lastWatchedTime: Math.floor(currentSecs),
          videoTitle: watchMeta?.title || '',
          videoThumbnail: watchMeta?.thumbnail || '',
          videoChannel: watchMeta?.channel || '',
          videoDuration: watchMeta?.duration || '',
          videoTopic: watchMeta?.topic || watchMeta?.category || ''
        }),
        keepalive: true
      }).catch(err => console.warn('Final tracking failed:', err));
    };
  }, [videoId]);

  return (
    <div className="w-full mx-auto">
      <style>{KEYFRAMES}</style>

      <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/30">
        {/* Thread A — YouTube IFrame mount */}
        <div className="absolute inset-0">
          <div ref={mountRef} className="w-full h-full" />
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close video"
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {resumeTime > 0 && (
          <div className="absolute top-3 left-3 z-30 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            Resumed from {fmtTime(resumeTime)}
          </div>
        )}

        {phase === 'mentor' && activeWow && (
          <MentorOverlay
            band={band}
            mentor={mentor}
            fact={activeWow.fact}
            relatableThing={activeWow.relatableThing}
            speaking={speaking}
            onSkip={handleSkip}
            onContinue={handleContinue}
          />
        )}

        {phase === 'gift' && (
          <GiftOverlay band={band} onOpen={handleOpenGift} onSkip={handleResume} />
        )}

        {phase === 'unlocked' && activeWow && (
          <UnlockedOverlay
            band={band}
            fact={activeWow.fact}
            relatableThing={activeWow.relatableThing}
            onResume={handleResume}
          />
        )}
      </div>

      {/* AI Intervention timeline — shows where the mentor will speak */}
      <AiTimeline
        mentor={mentor}
        wowFactors={wowFactors}
        currentTime={currentTime}
        duration={duration}
        status={ppuStatus}
        errorMessage={ppuError}
        badges={ppuBadges}
        triggered={triggered.current}
      />
    </div>
  );
}

// ------------------------------------------------------------ AI Timeline
function AiTimeline({ mentor, wowFactors, currentTime, duration, status, errorMessage, badges, triggered }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="mt-3 rounded-2xl border-2 border-white/40 px-4 py-3 shadow-lg"
      style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-gray-500 font-bold mb-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          ✨ AI Learning Timeline
        </span>
        <span className="font-mono text-gray-600 normal-case tracking-normal">
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>
      </div>

      {/* The track */}
      <div className="relative h-3 rounded-full bg-gray-200/60 overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-linear"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF6B6B, #A78BFA, #38BDF8)' }}
        />
        {wowFactors.map((w) => {
          const left = duration > 0 ? Math.min(99, (w.timestamp / duration) * 100) : 0;
          const done = triggered.has(w.timestamp);
          return (
            <div key={w.timestamp} className="absolute -top-1.5 -translate-x-1/2 group" style={{ left: `${left}%` }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white ${done ? 'bg-emerald-400' : ''} ${!done ? 'animate-pulse' : ''}`}
                style={!done ? { background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' } : {}}>
                <span className="text-xs">{done ? '✅' : '⭐'}</span>
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                <div className="rounded-lg text-[11px] px-2 py-1 shadow-xl border-2 border-white/50 font-bold"
                  style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', color: '#374151' }}>
                  <span className="font-mono text-violet-600">{fmtTime(w.timestamp)}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  {done ? 'Played ✅' : 'AI will speak here ✨'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-bold">
        <span className="flex items-center gap-1.5">⭐ Upcoming</span>
        <span className="flex items-center gap-1.5">✅ Played</span>
        <span className="ml-auto flex items-center gap-1.5">
          {status === 'loading' && <span className="text-violet-500">⟳ Getting learning points…</span>}
          {status === 'ready' && wowFactors.length > 0 && <span className="text-violet-600">{wowFactors.length} wow moment{wowFactors.length > 1 ? 's' : ''} 🌟</span>}
          {status === 'ready' && wowFactors.length === 0 && <span className="text-amber-500">No wow moments yet</span>}
          {status === 'empty' && <span className="text-amber-500">No transcript available</span>}
          {status === 'error' && <span className="text-red-500">Error: {errorMessage || 'Something went wrong'}</span>}
        </span>
      </div>
    </div>
  );
}

// ============================================================ Subcomponents
function MentorOverlay({ band, mentor, fact, relatableThing, speaking, onSkip, onContinue }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm gf-fade-in">
      <div className="relative w-full sm:w-[92%] max-w-3xl m-3 sm:m-0 rounded-3xl overflow-hidden shadow-2xl gf-slide-up border-2 border-white/50"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(255,237,213,0.8), rgba(196,181,253,0.75))', backdropFilter: 'blur(24px)' }}>
        <div className="relative flex items-stretch gap-4 p-5 sm:p-7">
          <div className="flex flex-col items-center justify-center shrink-0">
            <MentorAvatar mentor={mentor} size="md" speaking={speaking} />
            <div className="mt-2 text-xs font-bold text-gray-600">{mentor.name}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-500">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" /> ✨ Wow Factor!
              {speaking && <span className="ml-2 inline-flex items-center gap-1 text-emerald-500"><Volume2 className="w-3.5 h-3.5" /> speaking…</span>}
            </div>
            <p className={`mt-2 leading-snug text-gray-800 ${band === 'sensory' ? 'text-xl sm:text-2xl font-black' : band === 'functional' ? 'text-lg sm:text-xl font-bold' : 'text-base sm:text-lg font-semibold'}`}>
              {fact}
            </p>
            {relatableThing && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-100/60 border border-violet-200/50 text-xs font-bold text-violet-700">
                🌈 Just like {relatableThing}!
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onSkip}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-white/70 hover:bg-white text-gray-600 border-2 border-gray-200/60 transition shadow-sm">
                <SkipForward className="w-4 h-4" /> Skip
              </button>
              <button onClick={onContinue}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold text-white transition shadow-lg hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
                Continue 🎁
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftOverlay({ band, onOpen, onSkip }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm gf-fade-in">
      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <button onClick={onOpen}
          aria-label="Open your gift"
          className="group relative outline-none">
          <span className="absolute -inset-4 rounded-3xl blur-xl opacity-50 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #FF6B6B, #A78BFA, #38BDF8)' }} />
          <span className="relative block gf-gift-pop">
            <span className="relative block w-28 h-28 sm:w-32 sm:h-32">
              <span className="absolute inset-x-0 bottom-0 h-[70%] rounded-md shadow-xl group-hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }} />
              <span className="absolute inset-x-0 top-[28%] h-2 bg-white/85" />
              <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-white/85" />
              <span className="absolute left-0 right-0 top-[18%] h-[22%] rounded-t-md brightness-110 shadow-md gf-gift-lid"
                style={{ background: 'linear-gradient(135deg, #A78BFA, #38BDF8)' }} />
              <span className="absolute left-1/2 -translate-x-1/2 top-[4%] w-8 h-8 rounded-full bg-white/85 gf-gift-bow" />
            </span>
          </span>
        </button>
        <div className="text-white">
          <div className="text-xs uppercase tracking-[0.25em] opacity-80 flex items-center justify-center gap-2 font-bold">
            🎁 Gift Unlocked!
          </div>
          <div className="mt-1 font-black text-2xl">
            Tap the box to reveal! ✨
          </div>
        </div>
        <button onClick={onSkip}
          className="text-xs text-white/70 hover:text-white underline underline-offset-4 font-bold">
          Not now, keep watching
        </button>
      </div>
    </div>
  );
}

function UnlockedOverlay({ band, fact, relatableThing, onResume }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center pb-8 gf-fade-in">
      <div className="w-[92%] max-w-md rounded-2xl p-5 gf-slide-up border-2 border-white/50 shadow-2xl"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.9), rgba(255,237,213,0.85), rgba(196,181,253,0.8))', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
            <span className="text-2xl">🎁</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black uppercase tracking-widest text-violet-500">🎉 You unlocked a new video!</div>
            <p className="mt-0.5 text-sm font-bold text-gray-800 line-clamp-2">{relatableThing || fact}</p>
          </div>
          <button onClick={onResume}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-bold text-white shadow-md hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #FF6B6B, #A78BFA)' }}>
            OK ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================ Animations
const KEYFRAMES = `
@keyframes gf-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes gf-slide-up { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes gf-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes gf-gift-pop { 0% { transform: scale(0.4) rotate(-8deg); opacity: 0 }
  60% { transform: scale(1.08) rotate(3deg); opacity: 1 }
  80% { transform: scale(0.96) rotate(-2deg) } 100% { transform: scale(1) rotate(0) } }
@keyframes gf-gift-lid { 0%, 70% { transform: translateY(0) rotate(0) }
  85% { transform: translateY(-14px) rotate(-8deg) } 100% { transform: translateY(0) rotate(0) } }
@keyframes gf-gift-bow { 0%, 100% { transform: translate(-50%, 0) }
  50% { transform: translate(-50%, -3px) } }
@keyframes gf-highlight { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6) }
  50% { box-shadow: 0 0 0 14px rgba(99,102,241,0) } }
.gf-fade-in { animation: gf-fade-in 240ms ease-out both }
.gf-slide-up { animation: gf-slide-up 360ms cubic-bezier(.2,.9,.3,1.2) both }
.gf-float { animation: gf-float 2.2s ease-in-out infinite }
.gf-gift-pop { animation: gf-gift-pop 700ms cubic-bezier(.2,.9,.3,1.4) both }
.gf-gift-lid { animation: gf-gift-lid 1.4s ease-in-out infinite; transform-origin: left bottom }
.gf-gift-bow { animation: gf-gift-bow 1.4s ease-in-out infinite }
.gf-highlight { animation: gf-highlight 1.5s ease-out 3 }
`;

