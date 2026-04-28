import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const ACCENT = '#FBEC6B';
const childAvatars = ['/Name=01.png', '/Name=103.png', '/Name=188.png', '/Name=244.png', '/Name=52.png', '/Name=60.png', '/Name=88.png'];

export default function RoleChooser() {
  const navigate = useNavigate();
  const [childAvatar, setChildAvatar] = useState('/Name=01.png');
  const [parentAvatar, setParentAvatar] = useState('/Name=38.png');

  useEffect(() => {
    setChildAvatar(childAvatars[Math.floor(Math.random() * childAvatars.length)]);
    setParentAvatar(Math.random() > 0.5 ? '/Name=38.png' : '/Name=71.png');
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(150deg, #FFF9DB 0%, #FEF3C7 25%, #FFFBEB 50%, #FEFCE8 75%, #FFF7ED 100%)' }}>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] right-[15%] w-72 h-72 rounded-full bg-[#FBEC6B]/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[15%] left-[10%] w-56 h-56 rounded-full bg-pink-200/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-48 h-48 rounded-full bg-sky-200/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating emojis */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {['⭐', '🎨', '🚀', '📚', '🌟'].map((e, i) => (
          <motion.div key={i}
            animate={{ y: [0, -20, 0], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 5 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
            className="absolute text-2xl opacity-15"
            style={{ left: `${12 + i * 18}%`, top: `${20 + (i % 3) * 22}%` }}>
            {e}
          </motion.div>
        ))}
      </div>

      <header className="relative z-10 w-full flex items-center justify-between px-6 py-6 lg:px-12 lg:py-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-400 transition hover:text-gray-800"
        >
          <ChevronLeft className="h-5 w-5" /> Back
        </button>
        <button onClick={() => navigate('/')} className="text-3xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Khoj</span>
        </button>
        <div className="w-16" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border-2 border-white/60 shadow-sm"
            style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
            <Sparkles className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Choose your journey</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-800">
            Who's getting started?
          </h1>
          <p className="mt-3 text-gray-500 font-medium text-sm max-w-md mx-auto">
            Pick your role to begin the adventure ✨
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10">
          <ProfileCard name="Parent" subtitle="Guide & protect" emoji="🛡️" image={parentAvatar} onClick={() => navigate('/parent-auth')} delay={0.1} />
          <ProfileCard name="Child" subtitle="Learn & explore" emoji="🚀" image={childAvatar} onClick={() => navigate('/child-auth')} delay={0.2} />
          <AddProfileCard onClick={() => navigate('/parent-auth')} delay={0.3} />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-14">
          <button onClick={() => navigate('/parent-auth')}
            className="px-8 py-3 rounded-2xl text-sm font-bold text-gray-600 border-2 border-gray-200 hover:border-gray-400 hover:text-gray-800 transition-all"
            style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
            Manage Profiles →
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function ProfileCard({ name, subtitle, emoji, image, onClick, delay }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -4 }}
      className="group flex flex-col items-center"
    >
      <div className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 overflow-hidden rounded-3xl border-3 border-white/60 transition-all duration-300 group-hover:border-[#FBEC6B] group-hover:shadow-2xl shadow-lg"
        style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}>
        <img src={image} alt={name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-2 right-2 text-2xl opacity-0 group-hover:opacity-100 transition-opacity">{emoji}</div>
      </div>
      <span className="mt-4 text-gray-800 text-lg sm:text-xl font-bold transition-colors duration-300">
        {name}
      </span>
      <span className="text-xs text-gray-400 font-medium">{subtitle}</span>
    </motion.button>
  );
}

function AddProfileCard({ onClick, delay }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -4 }}
      className="group flex flex-col items-center"
    >
      <div className="flex h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 transition-all duration-300 group-hover:border-[#FBEC6B] group-hover:shadow-lg"
        style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}>
        <Plus className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 transition-colors duration-300 group-hover:text-gray-600" strokeWidth={2} />
      </div>
      <span className="mt-4 text-gray-400 text-lg sm:text-xl font-bold transition-colors duration-300 group-hover:text-gray-700">
        Add profile
      </span>
      <span className="text-xs text-gray-300 font-medium">New child</span>
    </motion.button>
  );
}
