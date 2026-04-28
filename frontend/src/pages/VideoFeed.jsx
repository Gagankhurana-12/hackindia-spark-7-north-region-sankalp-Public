import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Play, Info, Star, Eye, Clock, ChevronLeft, ChevronRight, Search, TrendingUp, Zap, Flame, BookOpen, Trophy, Filter } from 'lucide-react';
import { CATEGORIES } from '../data/mockVideos';
import { motion, AnimatePresence } from 'framer-motion';
import { Toddler, Explorer, Learner, Achiever } from '../components/landing/characters';
import { Navbar } from '../components/ui/mini-navbar';
import ActivityBook from '../components/ActivityBook';

import FloatingAiAssistant from '../components/ui/floating-ai-assistant';
import BalloonBackground from '../components/ui/balloon-background';

export default function VideoFeed() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [category, setCategory] = useState('all');

  const [videos, setVideos] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true); // start true so skeleton shows immediately
  const [feedError, setFeedError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const seenVideoIdsRef = useRef(new Set());

  const [isScrolled, setIsScrolled] = useState(false);
  const [childAvatar, setChildAvatar] = useState('/Name=01.png');

  const childAge = Number(localStorage.getItem('childAge')) || 10;
  const childName = localStorage.getItem('childName') || 'Explorer';

  const [gifts, setGifts] = useState([]);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('hasSeenIntro'));
  const introCharIndex = useRef(Math.floor(Math.random() * 4)).current;
  const chars = [Toddler, Explorer, Learner, Achiever];
  const IntroChar = chars[introCharIndex];

  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem('hasSeenIntro', 'true');
    }, 2000);
    return () => clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      navigate('/child-auth', { replace: true });
    } else {
      setAuthLoading(false);
      const avatars = ['/Name=01.png', '/Name=103.png', '/Name=188.png', '/Name=244.png', '/Name=52.png', '/Name=60.png', '/Name=88.png'];
      setChildAvatar(avatars[Math.floor(Math.random() * avatars.length)]);

      fetch('/api/gifts/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setGifts(data.gifts || []))
        .catch(err => console.warn('Failed to load gifts'));
    }
  }, [navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchFeedPage = (pageToken = null, append = false) => {
    const childToken = localStorage.getItem('childToken');
    if (append) setLoadingMore(true); else setFeedLoading(true);
    setFeedError(false);

    const params = new URLSearchParams({
      age: String(childAge),
      interest: category,
      maxResults: '32',
    });
    if (pageToken) params.set('pageToken', pageToken);

    fetch(`/api/ppu/feed?${params.toString()}`, {
      headers: childToken ? { Authorization: `Bearer ${childToken}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error(`Feed API returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.videos && data.videos.length > 0) {
          const mapped = data.videos
            .filter((vid) => vid?.id)
            .map((vid) => ({
              id: vid.id,
              videoId: vid.id,
              title: vid.display?.title || 'Unknown Title',
              thumbnail: vid.display?.thumbnail || '',
              channel: vid.context || 'YouTube',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(vid.context || 'Y')}&background=random&color=fff`,
              views: 'Popular',
              time: 'Recently added',
              duration: vid.display?.duration || '10:00',
              format: vid.format || 'normal',
              category: category,
              accent: CATEGORIES.find(c => c.id === category)?.gradient || 'from-indigo-600 to-sky-500'
            }));

          setVideos((prev) => {
            const existingIds = new Set(prev.map(v => v.id));
            const newVideos = append ? mapped.filter(v => !existingIds.has(v.id)) : mapped;
            const uniqueNewVideos = newVideos.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            return append ? [...prev, ...uniqueNewVideos] : uniqueNewVideos;
          });
          setNextPageToken(data.nextPageToken || null);
          setHasMore(Boolean(data.nextPageToken));
          setFeedLoading(false);
        } else {
          // API returned OK but no videos — treat as error so skeleton stays visible
          setFeedError(true);
          setFeedLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch feed:', err);
        setFeedError(true);
        setFeedLoading(false);
      })
      .finally(() => {
        if (append) setLoadingMore(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    setVideos([]);
    setNextPageToken(null);
    setHasMore(true);
    fetchFeedPage(null, false);
  }, [category, authLoading, childAge]);

  useEffect(() => {
    if (authLoading) return;
    const onScroll = () => {
      if (feedLoading || loadingMore || !hasMore || !nextPageToken) return;
      const doc = document.documentElement;
      const totalScrollable = doc.scrollHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const progress = window.scrollY / totalScrollable;
      if (progress >= 0.6) {
        fetchFeedPage(nextPageToken, true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [authLoading, feedLoading, loadingMore, hasMore, nextPageToken]);

  const handleLogout = () => {
    localStorage.removeItem('childToken');
    navigate('/');
  };

  // Pick 3 long-form videos (>60s) for the featured carousel.
  const longVideos = videos.filter((v) => parseDurationSeconds(v.duration) > 60);
  const featuredVideos = (longVideos.length >= 3 ? longVideos : videos).slice(0, 3);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  useEffect(() => {
    if (featuredVideos.length <= 1) return;
    const t = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % featuredVideos.length);
    }, 7000);
    return () => clearInterval(t);
  }, [featuredVideos.length]);

  const featured = featuredVideos[featuredIndex] || null;

  if (authLoading) return null;

  // Separate videos by format — shorts (≤60s) vs normal (>60s)
  const featuredIds = new Set(featuredVideos.map(v => v.id));
  const allNonFeatured = videos.filter(v => !featuredIds.has(v.id));
  const shortVideos = allNonFeatured.filter(v => v.format === 'short' || parseDurationSeconds(v.duration) <= 60);
  const normalVideos = allNonFeatured.filter(v => v.format !== 'short' && parseDurationSeconds(v.duration) > 60);

  // Titles for the continuous YouTube-style rows after the fixed sections
  const CONTINUING_TITLES = [
    "Trending Now",
    "Top 10 in Learning Today",
    "Because You Liked Science",
    "Award-Winning Content",
  ];

  const isTeen = childAge > 9;

  /* ═══════════════════════════════════════════════════════════════════
     ██  TEEN UI  —  Dark + #FBEC6B Gold Accent  (age > 9)
     ═══════════════════════════════════════════════════════════════════ */
  if (isTeen) {
    return (
      <div className="min-h-screen font-sans text-white overflow-x-hidden relative" style={{ background: '#0a0a0f' }}>
        {/* Subtle background grid + glow */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(251,236,107,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,236,107,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(251,236,107,0.08) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(251,236,107,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* ── Teen Navbar ── */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
          style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(24px)' }}>
          <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/video-feed" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight" style={{ color: '#FBEC6B' }}>KHOJ</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1 hidden sm:block">Smart</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
              <Link to="/video-feed" className="text-[#FBEC6B] font-semibold">Home</Link>
              <Link to="/video-feed" className="hover:text-white transition">Explore</Link>
              <Link to="/watch-history" className="hover:text-white transition">History</Link>
              <Link to="/ai-mentor" className="hover:text-white transition flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: '#FBEC6B' }} /> Spark AI
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/40">
                <Search className="w-3.5 h-3.5" /> <span>Search...</span>
              </div>
              <div className="relative group cursor-pointer flex items-center gap-2">
                <img src={childAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover ring-2" style={{ ringColor: '#FBEC6B' }} />
                <div className="absolute top-full right-0 mt-3 w-44 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl border border-white/10" style={{ background: '#151520' }}>
                  <Link to="/child-profile" className="flex items-center px-4 py-2.5 hover:bg-white/5 text-sm text-white/70 hover:text-white transition">Profile</Link>
                  <button onClick={handleLogout} className="flex items-center w-full px-4 py-2.5 hover:bg-red-500/10 text-sm text-red-400">Sign out</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Intro Animation (Teen) ── */}
        <AnimatePresence>
          {showIntro && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}
              className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#0a0a0f' }}>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, y: -100, opacity: 0 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
                className="flex flex-col items-center">
                <motion.div initial={{ width: 0 }} animate={{ width: 200 }} transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-1 rounded-full mb-8" style={{ background: '#FBEC6B' }} />
                <h1 className="text-5xl font-black tracking-tight" style={{ color: '#FBEC6B' }}>Hey, {childName}</h1>
                <p className="text-white/40 text-lg mt-3 font-medium">Ready to explore?</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`relative z-10 transition-all duration-700 ${showIntro ? 'blur-md opacity-30 pointer-events-none' : ''}`}>
          {/* ── Category Pills ── */}
          <div className="pt-24 px-4 sm:px-8">
            <div className="max-w-[1440px] mx-auto flex items-center gap-3 overflow-x-auto no-scrollbar pb-4">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${category === cat.id
                    ? 'text-gray-900 border-[#FBEC6B] shadow-lg shadow-[#FBEC6B]/20'
                    : 'text-white/50 border-white/10 hover:border-white/20 hover:text-white/70'}`}
                  style={category === cat.id ? { background: '#FBEC6B' } : { background: 'rgba(255,255,255,0.03)' }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Loading Skeleton (Teen) ── */}
          {(feedLoading || feedError) && videos.length === 0 && (
            <div className="px-4 sm:px-8 mt-6">
              <div className="max-w-[1440px] mx-auto">
                <div className="w-full aspect-[2.4/1] rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse">
                      <div className="aspect-video rounded-t-xl bg-white/[0.05]" />
                      <div className="p-3 space-y-2">
                        <div className="h-3.5 w-[80%] bg-white/[0.06] rounded" />
                        <div className="h-3 w-[50%] bg-white/[0.04] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
                {feedError && (
                  <div className="flex justify-center mt-8">
                    <button onClick={() => fetchFeedPage(null, false)}
                      className="px-6 py-2.5 rounded-full font-bold text-sm text-gray-900 hover:brightness-110 transition" style={{ background: '#FBEC6B' }}>
                      Retry ↻
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Featured Hero ── */}
          {featuredVideos.length > 0 && (
            <div className="px-4 sm:px-8 mt-4">
              <div className="max-w-[1440px] mx-auto relative">
                <div className="relative w-full aspect-[16/7] sm:aspect-[2.4/1] rounded-2xl overflow-hidden border border-white/[0.08]">
                  <AnimatePresence mode="wait">
                    <motion.div key={featured.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }} className="absolute inset-0">
                      <img src={featured.thumbnail} alt={featured.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />

                      <div className="absolute bottom-0 left-0 p-8 sm:p-12 max-w-[60%]">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-gray-900" style={{ background: '#FBEC6B' }}>Featured</span>
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold text-white/50 bg-white/10 border border-white/10">
                              <Zap className="w-3 h-3" style={{ color: '#FBEC6B' }} /> AI-Powered
                            </span>
                          </div>
                          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-[1.1] text-white">{featured.title}</h1>
                          <div className="flex items-center gap-3 mt-4 text-xs text-white/40 font-medium">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {featured.duration}</span>
                            <span>•</span>
                            <span>{featured.channel}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-5">
                            <Link to={`/watch/${featured.id}`}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm text-gray-900 hover:brightness-110 transition-all hover:scale-105"
                              style={{ background: '#FBEC6B' }}>
                              <Play className="w-4 h-4 fill-gray-900" /> Watch Now
                            </Link>
                            <Link to={`/watch/${featured.id}`}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white/70 border border-white/15 bg-white/5 hover:bg-white/10 transition">
                              <Info className="w-4 h-4" /> Details
                            </Link>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button onClick={() => setFeaturedIndex((i) => (i - 1 + featuredVideos.length) % featuredVideos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setFeaturedIndex((i) => (i + 1) % featuredVideos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {featuredVideos.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {featuredVideos.map((_, i) => (
                      <button key={i} onClick={() => setFeaturedIndex(i)}
                        className={`rounded-full transition-all ${i === featuredIndex ? 'w-8 h-1.5' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/30'}`}
                        style={i === featuredIndex ? { background: '#FBEC6B' } : {}} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Video Feed Sections (Teen) ── */}
          <div className="mt-10 pb-24 space-y-12">
            {/* 1. Recommended (8 Good Long-form Videos) */}
            {normalVideos.length > 0 && (
              <TeenVideoRow
                title="Recommended for You"
                icon={<Flame className="w-5 h-5" style={{ color: '#FBEC6B' }} />}
                items={normalVideos.slice(0, 8)}
              />
            )}

            {/* 2. Gifts Section */}
            {gifts.length > 0 && <TeenGiftRow gifts={gifts} />}

            {/* 3. Dedicated Shorts Row */}
            {shortVideos.length > 0 && (
              <TeenShortsRow
                title="Quick Learning Shorts"
                items={shortVideos}
              />
            )}

            {/* 4. Infinite Discovery Feed (Remaining Long-form) */}
            {normalVideos.length > 8 && (
              <div className="px-4 sm:px-8">
                <div className="max-w-[1440px] mx-auto">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: '#FBEC6B' }} />
                    Discovery Wall
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {normalVideos.slice(8).map((video, idx) => (
                      <motion.div
                        key={video.id + '-' + idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (idx % 5) * 0.1 }}
                      >
                        <TeenVideoCard video={video} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loadingMore && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 border-4 border-[#FBEC6B]/20 border-t-[#FBEC6B] rounded-full animate-spin" />
                <div className="text-sm font-medium text-white/30 uppercase tracking-widest">Fetching more content...</div>
              </div>
            )}
          </div>
        </div>

        <FloatingAiAssistant />
        <ActivityBook />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ██  KID UI  —  Sensory Stage Rainbow  (age ≤ 9) — UNCHANGED
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen font-sans text-gray-900 overflow-x-hidden relative"
      style={{ background: 'linear-gradient(150deg, #FFEDD5 0%, #FFC9DE 15%, #FCA5F1 30%, #C4B5FD 45%, #93C5FD 60%, #6EE7B7 75%, #FDE68A 90%, #FBBF24 100%)' }}
    >
      {/* ── Interactive Balloon Background ── */}
      <BalloonBackground balloonCount={25} />

      {/* ── Intro Animation Overlay ── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            style={{ background: 'linear-gradient(150deg, #FFEDD5dd 0%, #FFC9DEdd 20%, #C4B5FDdd 50%, #93C5FDdd 70%, #6EE7B7dd 100%)' }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1.2, y: -200, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-64 h-64 drop-shadow-2xl">
                <IntroChar />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 bg-gradient-to-r from-[#FF6B6B] to-[#FFE66D] text-white px-10 py-4 rounded-full text-3xl font-black shadow-2xl shadow-orange-400/30 border-2 border-white/30"
              >
                Hi {childName}! 🎉
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`relative z-10 transition-all duration-1000 ${showIntro ? 'blur-md scale-105 opacity-50 pointer-events-none' : 'blur-0 scale-100 opacity-100'}`}>
        {/* Navbar */}
        <Navbar childAvatar={childAvatar} handleLogout={handleLogout} />

        {/* ── Skeleton while SmartFetcher loads videos from YouTube (or on error) ── */}
        {(feedLoading || feedError) && videos.length === 0 && (
          <div className="relative w-full pt-24 sm:pt-28 pb-6 px-4 sm:px-10">
            {/* Welcome banner skeleton */}
            <div className="max-w-[1400px] mx-auto mb-6 flex items-center justify-between gap-4 px-6 sm:px-10 py-5 rounded-3xl border border-white/30"
              style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/40 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-7 w-48 bg-white/40 rounded-xl animate-pulse" />
                  <div className="h-4 w-64 bg-white/30 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="h-9 w-32 bg-violet-200/30 rounded-full animate-pulse hidden sm:block" />
            </div>
            {/* Carousel skeleton */}
            <div className="max-w-[1400px] mx-auto relative">
              <div className="w-full aspect-[16/7] sm:aspect-[2.4/1] rounded-[2rem] bg-white/20 animate-pulse border border-white/30 overflow-hidden"
                style={{ backdropFilter: 'blur(8px)' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 sm:p-10 space-y-3">
                  <div className="h-10 w-96 max-w-[60vw] bg-white/30 rounded-xl animate-pulse" />
                  <div className="flex gap-3">
                    <div className="h-7 w-20 bg-white/25 rounded-full animate-pulse" />
                    <div className="h-7 w-16 bg-white/25 rounded-full animate-pulse" />
                    <div className="h-7 w-24 bg-white/25 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-5">
                {feedError ? (
                  <button
                    onClick={() => fetchFeedPage(null, false)}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#A78BFA] text-white rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                  >
                    Retry Loading ↻
                  </button>
                ) : (
                  <>
                    <div className="w-10 h-3 bg-violet-300/30 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-white/30 rounded-full animate-pulse" />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Welcome Banner + BIG Carousel ── */}
        {featuredVideos.length > 0 && (
          <div className="relative w-full pt-24 sm:pt-28 pb-6 px-4 sm:px-10">
            {/* Welcome strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-[1400px] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-10 py-4 sm:py-5 rounded-3xl border border-white/50"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25))', backdropFilter: 'blur(20px)' }}
            >
              <div className="flex items-center gap-4">
                <img src={childAvatar} alt="avatar" className="w-14 h-14 rounded-2xl object-cover ring-3 ring-white/70 shadow-lg" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#FF6B6B] via-[#A78BFA] to-[#3B82F6] bg-clip-text text-transparent">
                    Hello, {childName}! 👋
                  </h2>
                  <p className="text-gray-500 text-sm font-medium mt-0.5">What adventure shall we go on today?</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full border shadow-sm"
                style={{ color: '#FF6B6B', background: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.25)' }}>
                <Sparkles className="w-5 h-5" style={{ color: '#FBBF24' }} /> Today's Picks ✨
              </div>
            </motion.div>

            {/* ── BIG Carousel ── */}
            <div className="relative max-w-[1400px] mx-auto">
              <div className="relative w-full aspect-[16/7] sm:aspect-[2.4/1] rounded-[2rem] overflow-hidden shadow-[0_20px_80px_rgba(167,139,250,0.25)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featured.id}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    {/* Thumbnail */}
                    <img src={featured.thumbnail} alt={featured.title} className="w-full h-full object-cover" />

                    {/* Colorful theme overlay */}
                    <div className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, rgba(255,107,107,0.30), rgba(167,139,250,0.25) 50%, rgba(96,165,250,0.20))`,
                        mixBlendMode: 'multiply',
                      }}
                    />
                    {/* Bottom vignette for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    {/* Left vignette */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

                    {/* Title + CTA area */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 flex flex-col sm:flex-row items-end sm:items-end justify-between gap-4">
                      <motion.div
                        key={featured.id + '-txt'}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="flex-1"
                      >
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight max-w-[700px]"
                          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(167,139,250,0.5)' }}
                        >
                          {featured.title}
                        </h1>
                        <div className="flex items-center gap-3 mt-4">
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold">
                            <Clock className="w-3.5 h-3.5" /> {featured.duration || '10:00'}
                          </span>
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {(4.5 + ((featured.id || 0) % 5) / 10).toFixed(1)}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold">
                            {featured.channel}
                          </span>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                      >
                        <Link to={`/watch/${featured.id}`}
                          className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B6B] to-[#FFE66D] text-white px-7 py-3 rounded-full text-base font-bold shadow-lg shadow-orange-400/30 hover:shadow-xl hover:shadow-orange-400/40 hover:scale-105 transition-all"
                        >
                          <Play className="w-5 h-5 fill-white" /> Watch Now
                        </Link>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Left/Right arrows */}
                <button
                  onClick={() => setFeaturedIndex((i) => (i - 1 + featuredVideos.length) % featuredVideos.length)}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 bg-white/30 hover:bg-white/60 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-white hover:text-gray-900 shadow-xl transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button
                  onClick={() => setFeaturedIndex((i) => (i + 1) % featuredVideos.length)}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 bg-white/30 hover:bg-white/60 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-center text-white hover:text-gray-900 shadow-xl transition-all hover:scale-110"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>

              {/* Floating dots */}
              {featuredVideos.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  {featuredVideos.map((_, i) => {
                    const active = i === featuredIndex;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => setFeaturedIndex(i)}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                        className={`rounded-full transition-all duration-500 ${active
                          ? 'w-10 h-3 bg-gradient-to-r from-[#FF6B6B] to-[#A78BFA] shadow-md shadow-violet-400/40'
                          : 'w-3 h-3 bg-gray-400/40 hover:bg-gray-400/70'
                          }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feed Sections (Kid) */}
        <div className="mt-12 relative z-10 pb-20 space-y-12">
          {/* 1. Recommended (8 Good Long-form Videos) */}
          {normalVideos.length > 0 && (
            <VideoRow
              title={`Cool Picks for ${childName} 🌟`}
              items={normalVideos.slice(0, 8)}
            />
          )}

          {/* 2. Gifts Section */}
          {gifts.length > 0 && <GiftRow gifts={gifts} />}

          {/* 3. Dedicated Shorts Row */}
          {shortVideos.length > 0 && (
            <ShortsRow
              title="Mini Adventures (Shorts) ⚡"
              items={shortVideos}
            />
          )}

          {/* 4. Infinite Discovery Wall (Remaining Long-form) */}
          {normalVideos.length > 8 && (
            <div className="px-4 sm:px-12">
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">🚀</span> Keep Exploring!
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {normalVideos.slice(8).map((video, idx) => (
                  <motion.div
                    key={video.id + '-' + idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', damping: 15 }}
                  >
                    <KidVideoCard video={video} idx={idx} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {loadingMore && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-500 shadow-lg"
              />
              <span className="text-lg font-bold text-violet-600 animate-bounce">Finding more magic... ✨</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Spark AI Assistant */}
      <FloatingAiAssistant />
      <ActivityBook />
    </div>

  );
}

// Helpers

function parseDurationSeconds(d) {
  if (!d || typeof d !== 'string') return 0;
  const parts = d.split(':').map((p) => Number(p) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// Subcomponents

const ROW_EMOJIS = ['🔥', '💡', '🌟', '🏆', '🔬', '📈', '🎯', '🧩'];

const KID_CARD_BORDERS = ['border-[#FF6B6B]/50', 'border-[#A78BFA]/50', 'border-[#38BDF8]/50', 'border-[#34D399]/50', 'border-[#FBBF24]/50', 'border-[#F472B6]/50'];
const KID_TAG_COLORS = [
  'text-[#FF6B6B] bg-[#FF6B6B]/15', 'text-[#A78BFA] bg-[#A78BFA]/15', 'text-[#38BDF8] bg-[#38BDF8]/15',
  'text-[#34D399] bg-[#34D399]/15', 'text-[#FBBF24] bg-[#FBBF24]/20', 'text-[#F472B6] bg-[#F472B6]/15',
];

function VideoRow({ title, items }) {
  if (!items || items.length === 0) return null;
  const emoji = ROW_EMOJIS[Math.abs(title.length) % ROW_EMOJIS.length];
  return (
    <div className="relative">
      <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-6 px-4 sm:px-12 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span> {title}
      </h2>
      <div className="flex gap-8 overflow-x-auto px-4 sm:px-12 no-scrollbar pb-8 pt-2 snap-x">
        {items.map((video, idx) => (
          <div key={video.id + '-' + idx} className="shrink-0 w-[80vw] sm:w-[calc(25%-1.5rem)] snap-start">
            <KidVideoCard video={video} idx={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GiftRow({ gifts }) {
  if (!gifts || gifts.length === 0) return null;

  return (
    <div className="mt-12 relative">
      <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-6 px-4 sm:px-12 flex items-center gap-2">
        <span className="text-2xl">🎁</span> Unlocked Curiosity Gifts
      </h2>

      <div className="flex gap-8 overflow-x-auto px-4 sm:px-12 no-scrollbar pb-8 pt-2 snap-x">
        {gifts.map((gift, idx) => {
          const isVideo = gift.giftType === 'video' || gift.unlockedVideoId;
          return (
            <div key={gift._id || idx} className="shrink-0 w-[80vw] sm:w-[calc(25%-1.5rem)] snap-start">
              <Link
                to={isVideo ? `/watch/${gift.unlockedVideoId}` : '#'}
                className="relative block w-full aspect-video rounded-[2rem] overflow-hidden group cursor-pointer
                           transition-all duration-500 hover:scale-[1.1] hover:-rotate-1 hover:z-20
                           shadow-lg hover:shadow-2xl shadow-amber-200/20
                           border-[4px] border-white"
              >
                <div className="w-full h-full overflow-hidden">
                  {isVideo ? (
                    <img src={gift.unlockedVideoThumbnail} alt={gift.unlockedVideoTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FDE68A, #FCA5F1, #C4B5FD)' }}>
                      <span className="text-6xl">🎁</span>
                    </div>
                  )}
                </div>

                {/* Floating Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black bg-amber-400 text-amber-900 border border-white/40 shadow-sm transition-transform duration-500 group-hover:scale-110">
                  ✨ SPECIAL GIFT
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5"
                  style={{ background: 'linear-gradient(to top, rgba(162, 53, 0, 0.8) 0%, rgba(251, 191, 36, 0.3) 60%, transparent 100%)' }}>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileHover={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl mb-1">
                      <Play className="w-6 h-6 fill-amber-500 text-amber-500 ml-1" />
                    </div>
                    <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest">{gift.relatableThing}</span>
                    <h3 className="text-white text-base font-black leading-tight drop-shadow-lg line-clamp-2">
                      {isVideo ? gift.unlockedVideoTitle : gift.videoTitle}
                    </h3>
                  </motion.div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const KID_SHORT_GLOWS = ['shadow-[#FF6B6B]/25', 'shadow-[#A78BFA]/25', 'shadow-[#38BDF8]/25', 'shadow-[#F472B6]/25', 'shadow-[#34D399]/25', 'shadow-[#FBBF24]/25'];

function ShortsRow({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="relative">
      <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 mb-4 px-4 sm:px-12 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#FF6B6B] fill-[#FF6B6B]" viewBox="0 0 24 24"><path d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 00-3.5-6.62L6 6.94a3.74 3.74 0 00.23 6.74l1.2.49L6 14.93a3.75 3.75 0 003.5 6.63l8.5-4.5a3.74 3.74 0 00-.23-6.74z" /><polygon fill="#fff" points="10 14.65 15 12 10 9.35 10 14.65" /></svg>
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 sm:px-12 no-scrollbar pb-4 pt-2">
        {items.map((video, idx) => (
          <Link key={video.id + '-' + idx} to={`/watch/${video.id}`}
            className={`relative shrink-0 w-36 sm:w-48 aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer
                       transition-all duration-300 hover:scale-[1.06] hover:z-10
                       shadow-md hover:shadow-xl
                       border-2 border-white/50 hover:border-[#F472B6]/50`}
          >
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 flex flex-col justify-end p-3"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(167,139,250,0.15) 50%, transparent 100%)' }}>
              <h3 className="text-white text-sm font-bold line-clamp-2 mb-1 drop-shadow-md">{video.title}</h3>
              <div className="text-[10px] text-white/80 line-clamp-1">{video.views || '996k views'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  TEEN SUBCOMPONENTS  —  Dark Theme
   ═══════════════════════════════════════════════════════════════════ */

function TeenVideoRow({ title, icon, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="px-4 sm:px-8">
      <div className="max-w-[1440px] mx-auto">
        <h2 className="text-base sm:text-lg font-bold text-white/90 mb-4 flex items-center gap-2.5">
          {icon} {title}
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {items.map((video, idx) => (
            <Link key={video.id + '-t-' + idx} to={`/watch/${video.id}`}
              className="relative shrink-0 w-[42vw] sm:w-60 rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.04] hover:z-10 border border-white/[0.06] hover:border-[#FBEC6B]/30"
              style={{ background: '#111118' }}>
              <div className="aspect-video overflow-hidden relative">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white/80">{video.duration || '10:00'}</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,236,107,0.9)' }}>
                    <Play className="w-4 h-4 fill-gray-900 text-gray-900 ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-white/90 text-sm font-semibold line-clamp-2 leading-snug">{video.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-white/35">
                  <span className="font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-[#FBEC6B]/20" style={{ color: '#FBEC6B' }}>AI</span>
                  <span>{video.channel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeenShortsRow({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="px-4 sm:px-8">
      <div className="max-w-[1440px] mx-auto">
        <h2 className="text-base sm:text-lg font-bold text-white/90 mb-4 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 fill-red-500" viewBox="0 0 24 24"><path d="M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 00-3.5-6.62L6 6.94a3.74 3.74 0 00.23 6.74l1.2.49L6 14.93a3.75 3.75 0 003.5 6.63l8.5-4.5a3.74 3.74 0 00-.23-6.74z" /><polygon fill="#fff" points="10 14.65 15 12 10 9.35 10 14.65" /></svg>
          {title}
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {items.map((video, idx) => (
            <Link key={video.id + '-ts-' + idx} to={`/watch/${video.id}`}
              className="relative shrink-0 w-32 sm:w-40 aspect-[9/16] rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.04] hover:z-10 border border-white/[0.06] hover:border-[#FBEC6B]/30">
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white text-xs font-bold line-clamp-2">{video.title}</h3>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,236,107,0.9)' }}>
                  <Play className="w-3.5 h-3.5 fill-gray-900 text-gray-900 ml-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeenGiftRow({ gifts }) {
  if (!gifts || gifts.length === 0) return null;
  return (
    <div className="px-4 sm:px-8">
      <div className="max-w-[1440px] mx-auto">
        <h2 className="text-base sm:text-lg font-bold text-white/90 mb-4 flex items-center gap-2.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ background: '#FBEC6B', color: '#0a0a0f' }}>🎁</span>
          Unlocked Discoveries
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {gifts.map((gift, idx) => {
            const isVideo = gift.giftType === 'video' || gift.unlockedVideoId;
            return (
              <Link key={gift._id || idx} to={isVideo ? `/watch/${gift.unlockedVideoId}` : '#'}
                className="relative shrink-0 w-[42vw] sm:w-60 rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.04] border border-[#FBEC6B]/10 hover:border-[#FBEC6B]/30"
                style={{ background: '#111118' }}>
                <div className="aspect-video overflow-hidden relative">
                  {isVideo ? (
                    <img src={gift.unlockedVideoThumbnail} alt={gift.unlockedVideoTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                      <span className="text-4xl">🎁</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider" style={{ background: '#FBEC6B', color: '#0a0a0f' }}>Gift</div>
                </div>
                <div className="p-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#FBEC6B' }}>From: {gift.relatableThing}</span>
                  <h3 className="text-white/90 text-sm font-semibold line-clamp-1 mt-1">{isVideo ? gift.unlockedVideoTitle : gift.videoTitle}</h3>
                  <p className="text-[10px] text-white/30 italic line-clamp-1 mt-0.5">"{gift.fact}"</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeenVideoCard({ video }) {
  return (
    <Link to={`/watch/${video.id}`}
      className="relative block rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.04] border border-white/[0.06] hover:border-[#FBEC6B]/30"
      style={{ background: '#111118' }}>
      <div className="aspect-video overflow-hidden relative">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-transparent to-transparent opacity-60" />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white/80">{video.duration || '10:00'}</div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,236,107,0.9)' }}>
            <Play className="w-4 h-4 fill-gray-900 text-gray-900 ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-white/90 text-sm font-semibold line-clamp-2 leading-snug h-10">{video.title}</h3>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-white/35">
          <span className="font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-[#FBEC6B]/20" style={{ color: '#FBEC6B' }}>AI</span>
          <span>{video.channel}</span>
        </div>
      </div>
    </Link>
  );
}

function KidVideoCard({ video, idx, widthClass = "w-full" }) {
  const borderC = KID_CARD_BORDERS[idx % KID_CARD_BORDERS.length];
  const tagC = KID_TAG_COLORS[idx % KID_TAG_COLORS.length];
  const glowC = KID_SHORT_GLOWS[idx % KID_SHORT_GLOWS.length];

  return (
    <Link to={`/watch/${video.id}`}
      className={`relative block ${widthClass} aspect-video rounded-[2rem] overflow-hidden group cursor-pointer
                 transition-all duration-500 hover:scale-[1.1] hover:-rotate-1 hover:z-20
                 shadow-lg hover:shadow-2xl ${glowC}
                 border-[4px] border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]`}
    >
      {/* Thumbnail */}
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

      {/* Floating Sparkle Badge (AI Mentor) */}
      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md border border-white/40 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${tagC}`}>
        ✨ AI MAGIC
      </div>

      {/* Duration Badge */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
        {video.duration || '5:00'}
      </div>

      {/* Interactive Overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(167,139,250,0.3) 60%, transparent 100%)' }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileHover={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center text-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl mb-1">
            <Play className="w-6 h-6 fill-violet-500 text-violet-500 ml-1" />
          </div>
          <h3 className="text-white text-base font-black leading-tight drop-shadow-lg line-clamp-2">
            {video.title}
          </h3>
        </motion.div>
      </div>

      {/* Inner Border Glow */}
      <div className={`absolute inset-0 border-[6px] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${borderC.replace('hover:', '')}`} />
    </Link>
  );
}