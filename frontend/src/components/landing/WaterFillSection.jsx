import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

function SwimmingCharacter({ className }) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ellipse cx="100" cy="100" rx="50" ry="40" fill="url(#charGrad)" />
      <circle cx="85" cy="90" r="6" fill="#1a1a2e" />
      <circle cx="115" cy="90" r="6" fill="#1a1a2e" />
      <circle cx="87" cy="88" r="2" fill="white" />
      <circle cx="117" cy="88" r="2" fill="white" />
      <ellipse cx="100" cy="110" rx="12" ry="8" fill="#ff6b9d" />
      <ellipse cx="70" cy="100" rx="8" ry="6" fill="#ffb3c6" opacity="0.6" />
      <ellipse cx="130" cy="100" rx="8" ry="6" fill="#ffb3c6" opacity="0.6" />
      <motion.ellipse
        cx="40" cy="90" rx="20" ry="10" fill="url(#charGrad)"
        animate={{ rotate: [0, 30, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ transformOrigin: '60px 90px' }}
      />
      <motion.ellipse
        cx="160" cy="90" rx="20" ry="10" fill="url(#charGrad)"
        animate={{ rotate: [0, -30, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
        style={{ transformOrigin: '140px 90px' }}
      />
      <motion.ellipse
        cx="100" cy="150" rx="15" ry="20" fill="url(#charGrad)"
        animate={{ scaleX: [1, 1.2, 1] }}
        transition={{ duration: 0.3, repeat: Infinity }}
      />
      <motion.circle
        cx="130" cy="70" r="5" fill="white" opacity="0.6"
        animate={{ y: [-10, -30], opacity: [0.6, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <defs>
        <linearGradient id="charGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="50%" stopColor="#FF8E53" />
          <stop offset="100%" stopColor="#FF6B9D" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

function WaterWave({ delay = 0 }) {
  return (
    <motion.div
      className="absolute left-0 right-0 h-8"
      animate={{ x: [0, -100, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay }}
    >
      <svg viewBox="0 0 1200 50" preserveAspectRatio="none" className="h-full w-[200%]">
        <path d="M0,25 Q150,0 300,25 T600,25 T900,25 T1200,25 L1200,50 L0,50 Z" fill="currentColor" />
      </svg>
    </motion.div>
  );
}

export default function WaterFillSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const waterHeight = useTransform(scrollYProgress, [0, 0.6], ['0%', '100%']);
  const characterY = useTransform(scrollYProgress, [0.3, 0.6], [200, 0]);
  const characterOpacity = useTransform(scrollYProgress, [0.3, 0.4], [0, 1]);
  const textOpacity = useTransform(scrollYProgress, [0.5, 0.7], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.5, 0.7], [50, 0]);

  return (
    <section ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-gradient-to-b from-[#010828] to-[#0a1628]">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-cyan-400/10"
              style={{
                width: 20, height: 20,
                left: `${(i * 53) % 100}%`,
                bottom: `${(i * 37) % 50}%`,
              }}
              animate={{ y: [-20, -200], opacity: [0.3, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>

        <motion.div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ height: waterHeight }}>
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-600 via-cyan-500 to-cyan-400 opacity-80" />
          <div className="absolute -top-4 left-0 right-0 text-cyan-400/60"><WaterWave /></div>
          <div className="absolute -top-2 left-0 right-0 text-cyan-500/40"><WaterWave delay={0.5} /></div>

          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ y: characterY, opacity: characterOpacity, top: '30%' }}
          >
            <SwimmingCharacter className="h-40 w-40 md:h-56 md:w-56" />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center px-4"
          style={{ opacity: textOpacity, y: textY }}
        >
          <div className="z-10 max-w-4xl text-center">
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Introducing
            </motion.div>

            <h2 className="mb-6 text-5xl font-black uppercase leading-none tracking-tight text-white md:text-7xl lg:text-8xl">
              <span className="text-cyan-300">GROWTH</span>FEED
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-xl text-white/80 md:text-2xl">
              Transform screen time into{' '}
              <span className="font-semibold text-cyan-300">learning time</span>.
              We filter content and bridge fun to education.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-cyan-200">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">Age-Appropriate</span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">Interest-Based</span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1">AI-Powered</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
