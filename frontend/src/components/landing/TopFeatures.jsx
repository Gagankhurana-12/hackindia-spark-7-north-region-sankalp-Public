import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Smart Content Filter',
    description:
      'AI scans every frame and caption in real time. Junk content gets blocked — only age-appropriate, curious-making videos reach your child.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Parent Screen Control',
    description:
      'Set limits per child, per topic, per time of day. Bedtime mode, subject boosts, and gentle nudges keep things healthy without drama.',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5 20.5l2-7L1.5 9h7z" />
      </svg>
    ),
    title: 'Wow-Factor Engine',
    description:
      'Every video pauses at its most interesting second. The AI mentor drops a "Hey, did you know…?" fact tuned to your child\u2019s age band.',
    color: 'from-fuchsia-500 to-pink-500',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-6 4 3 5-8" />
      </svg>
    ),
    title: 'Insight Dashboard',
    description:
      'Parents see what their child watched, what sparked curiosity, and what topics to explore next — with weekly growth reports.',
    color: 'from-orange-500 to-yellow-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
];

function FeatureMascot() {
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="h-32 w-32"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ellipse cx="60" cy="70" rx="40" ry="35" fill="url(#mascotGrad)" />
      <circle cx="45" cy="60" r="8" fill="#1a1a2e" />
      <circle cx="75" cy="60" r="8" fill="#1a1a2e" />
      <circle cx="47" cy="58" r="3" fill="white" />
      <circle cx="77" cy="58" r="3" fill="white" />
      <path d="M45 80 Q60 95 75 80" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="70" rx="6" ry="4" fill="#ffb3c6" opacity="0.6" />
      <ellipse cx="90" cy="70" rx="6" ry="4" fill="#ffb3c6" opacity="0.6" />
      <motion.g animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <path d="M100 30 L103 35 L108 35 L104 39 L106 44 L100 41 L94 44 L96 39 L92 35 L97 35 Z" fill="#FFD93D" />
        <path d="M20 40 L22 43 L25 43 L23 46 L24 49 L20 47 L16 49 L17 46 L15 43 L18 43 Z" fill="#6FFF00" />
      </motion.g>
      <defs>
        <linearGradient id="mascotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6FFF00" />
          <stop offset="50%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

export default function TopFeatures() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const mascotY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section id="features" ref={ref} className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] via-[#010828] to-[#010828] px-4 py-32">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            Top Features
          </div>
          <h2 className="mb-6 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl lg:text-7xl">
            Protecting minds,
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
              nurturing growth
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 md:text-xl">
            Four systems working together to turn every video into a stepping stone.
          </p>
        </motion.div>

        <motion.div className="absolute right-0 top-20 hidden lg:block" style={{ y: mascotY }}>
          <FeatureMascot />
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="group"
            >
              <div className={`relative overflow-hidden rounded-3xl p-8 backdrop-blur-sm transition-all duration-300 ${f.bg} border ${f.border}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />
                <div className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <span className="text-sm font-bold text-white/40">0{i + 1}</span>
                </div>
                <motion.div
                  className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${f.color}`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {f.icon}
                </motion.div>
                <h3 className="mb-3 text-xl font-bold text-white md:text-2xl">{f.title}</h3>
                <p className="leading-relaxed text-slate-300">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
