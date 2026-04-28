import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

const ACCENT = '#FBEC6B';
const INTERESTS = ['🚀 Space', '🦕 Dinosaurs', '🎨 Art', '🔬 Science', '🎵 Music', '🐾 Animals', '⚽ Sports', '🧮 Math', '📖 Stories', '🌍 Geography'];

export default function ChildAuth() {
  const navigate = useNavigate();
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkCode: linkCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      localStorage.setItem('childToken', data.token);
      if (data.child) {
        localStorage.setItem('childAge', String(data.child.age || 10));
        localStorage.setItem('childName', String(data.child.name || ''));
        localStorage.setItem('childInterests', JSON.stringify(Array.isArray(data.child.interests) ? data.child.interests : []));
      }
      navigate('/video-feed', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #FFF9DB 0%, #FEF3C7 25%, #FFFBEB 50%, #FEFCE8 75%, #FFF7ED 100%)' }}>

      {/* Soft background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[5%] right-[10%] w-64 h-64 rounded-full bg-[#FBEC6B]/25 blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] left-[5%] w-48 h-48 rounded-full bg-pink-200/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[50%] left-[40%] w-40 h-40 rounded-full bg-sky-200/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating emojis */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {['⭐', '🌈', '🚀', '🎨', '🦋', '✨'].map((e, i) => (
          <motion.div key={i}
            animate={{ y: [0, -30, 0], x: [0, 15, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
            className="absolute text-3xl opacity-20"
            style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 25}%` }}>
            {e}
          </motion.div>
        ))}
      </div>

      {/* Logo */}
      <button onClick={() => navigate('/')} className="absolute left-6 top-6 z-20">
        <span className="text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Khoj</span>
      </button>

      {/* Left: Illustration (desktop) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative z-10">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
          className="w-full max-w-lg text-center">
          <img src="/image copy.png" alt="Child adventure illustration" className="w-full h-auto drop-shadow-2xl rounded-3xl mb-8" />
          <h2 className="text-4xl font-black text-gray-800 leading-tight">
            Start Your <span style={{ color: '#D4A017' }}>Adventure</span><br/>
            With What You Love! 🌟
          </h2>
          <p className="mt-4 text-gray-500 font-medium text-sm max-w-md mx-auto">
            Every video is a new discovery. Learn, play, and explore — your way!
          </p>
          {/* Floating interest pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {INTERESTS.slice(0, 6).map((interest, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="px-3 py-1.5 rounded-full border-2 border-white/60 text-xs font-bold text-gray-600 shadow-sm"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}>
                {interest}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm rounded-3xl border-2 border-white/60 p-8 sm:p-10 text-center shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)' }}>

          {/* Hero icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl"
            style={{ background: ACCENT }}>
            <Rocket className="h-10 w-10 text-gray-800" />
          </div>

          <h2 className="mb-2 text-3xl font-black tracking-tight text-gray-800">
            Hey Explorer! 🎉
          </h2>
          <p className="mb-6 text-sm font-medium text-gray-500">
            Enter your secret code to start your journey
          </p>

          {/* Mobile illustration */}
          <div className="lg:hidden mb-6">
            <img src="/image copy.png" alt="Child illustration" className="w-40 h-auto mx-auto rounded-2xl drop-shadow-lg" />
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-left text-sm text-red-600 font-bold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                type="text" required maxLength={6}
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                className="block w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-5 text-center font-mono text-3xl font-black uppercase tracking-[0.5em] text-gray-800 placeholder:text-gray-300 focus:border-[#FBEC6B] focus:outline-none focus:ring-2 focus:ring-[#FBEC6B]/40 transition"
                placeholder="• • • • • •"
              />
              <p className="mt-2 text-xs text-gray-400 font-medium">Ask your parent for the code ✨</p>
            </div>

            <button type="submit" disabled={loading || linkCode.length < 4}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black text-gray-800 shadow-lg transition hover:brightness-105 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: ACCENT }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-800/30 border-t-gray-800 rounded-full animate-spin" />
                  Entering...
                </span>
              ) : (
                <>Let's Go! <Sparkles className="h-5 w-5" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200/60">
            <button onClick={() => navigate('/get-started')}
              className="text-sm font-bold text-gray-400 transition hover:text-gray-700">
              Wait, I'm a parent →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}