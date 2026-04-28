import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import MentorChatPanel from '../components/MentorChatPanel';

export default function AIMentorChat() {
  const navigate = useNavigate();
  const childAge = Number(localStorage.getItem('childAge')) || 10;
  const isTeen = childAge > 9;

  useEffect(() => {
    if (!localStorage.getItem('childToken')) {
      navigate('/child-auth', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="h-dvh text-white p-4 sm:p-6 font-sans flex flex-col overflow-hidden relative"
      style={{ background: isTeen ? '#0a0a0f' : '#0E0E16' }}>
      {/* Decorative Glows */}
      {isTeen ? (
        <>
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(251,236,107,0.06)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(251,236,107,0.04)' }} />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(251,236,107,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,236,107,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </>
      ) : (
        <>
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(255,107,107,0.1)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(167,139,250,0.08)' }} />
          <div className="absolute top-[40%] left-[50%] w-[25vw] h-[25vw] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(251,191,36,0.06)' }} />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-6xl w-full mx-auto flex-1 min-h-0 flex flex-col relative z-10"
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <Link to="/video-feed" className={`inline-flex items-center gap-2 font-bold transition ${isTeen ? 'text-white/50 hover:text-white' : 'text-white/70 hover:text-white'}`}>
            <ArrowLeft className="w-5 h-5" /> Back to Explore
          </Link>
          {isTeen ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest"
              style={{ borderColor: 'rgba(251,236,107,0.25)', background: 'rgba(251,236,107,0.08)', color: '#FBEC6B' }}>
              <Zap className="w-3.5 h-3.5" /> Spark Chat
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest"
              style={{ borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', boxShadow: '0 0 15px rgba(255,107,107,0.15)' }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#FBBF24' }} /> Spark Chat ✨
            </span>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-3xl border overflow-hidden flex-1 min-h-0 flex flex-col mb-2 sm:mb-4 ${isTeen ? 'border-white/[0.06]' : 'border-white/10'}`}
          style={{ background: isTeen ? '#111118' : '#1E1E2A', boxShadow: isTeen ? undefined : '0 10px 50px rgba(255,107,107,0.1)' }}
        >
          <MentorChatPanel
            mode="general"
            title="Spark — your Khoj mentor"
            subtitle="Voice or text chat powered by child profile, memory, and history."
            startFresh
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
