import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const phrases = [
  {
    kicker: 'the problem',
    line1: 'Your child is scrolling',
    line2: 'into brain rot.',
    tint: 'from-rose-400 via-red-400 to-orange-400',
    bg: 'from-rose-950/40 via-slate-950 to-slate-950',
  },
  {
    kicker: 'the shift',
    line1: 'What if that same scroll',
    line2: 'became a classroom?',
    tint: 'from-amber-300 via-yellow-300 to-amber-400',
    bg: 'from-amber-950/30 via-slate-950 to-slate-950',
  },
  {
    kicker: 'the magic',
    line1: 'Every video pauses to ask,',
    line2: '"Hey, did you know…?"',
    tint: 'from-fuchsia-300 via-pink-300 to-rose-300',
    bg: 'from-fuchsia-950/30 via-slate-950 to-slate-950',
  },
  {
    kicker: 'the promise',
    line1: 'Parents stay in the loop.',
    line2: 'Kids stay curious.',
    tint: 'from-cyan-300 via-sky-300 to-blue-300',
    bg: 'from-sky-950/30 via-slate-950 to-slate-950',
  },
  {
    kicker: 'the outcome',
    line1: 'This isn\u2019t screen time.',
    line2: 'It\u2019s growth.',
    tint: 'from-emerald-300 via-teal-300 to-cyan-300',
    bg: 'from-emerald-950/30 via-slate-950 to-slate-950',
  },
];

export default function ScrollRibbon() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section ref={ref} className="relative h-[500vh] bg-slate-950">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {phrases.map((p, i) => {
          const start = i * 0.2;
          const end = start + 0.2;
          const bgOffsets = [
            Math.max(0, start - 0.05),
            Math.min(1, start + 0.03),
            Math.max(0, end - 0.03),
            Math.min(1, end + 0.05),
          ];
          const opacity = useTransform(
            scrollYProgress,
            bgOffsets,
            [0, 1, 1, 0],
          );
          const y = useTransform(
            scrollYProgress,
            bgOffsets,
            [40, 0, 0, -40],
          );
          const scale = useTransform(
            scrollYProgress,
            bgOffsets,
            [0.94, 1, 1, 0.94],
          );

          return (
            <motion.div
              key={i}
              style={{ opacity }}
              className={`absolute inset-0 bg-gradient-to-b ${p.bg}`}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.85)_100%)]" />

        {phrases.map((p, i) => {
          const start = i * 0.2;
          const end = start + 0.2;
          const txtOffsets = [
            Math.max(0, start - 0.03),
            Math.min(1, start + 0.04),
            Math.max(0, end - 0.04),
            Math.min(1, end + 0.03),
          ];
          const opacity = useTransform(
            scrollYProgress,
            txtOffsets,
            [0, 1, 1, 0],
          );
          const y = useTransform(
            scrollYProgress,
            txtOffsets,
            [60, 0, 0, -60],
          );

          return (
            <motion.div
              key={i}
              style={{ opacity, y }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              <div className="max-w-5xl text-center">
                <motion.p
                  className="mb-6 text-xs font-bold uppercase tracking-[0.4em] text-white/60"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {p.kicker}
                </motion.p>
                <h2 className="text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
                  <span className="block">{p.line1}</span>
                  <span
                    className={`block bg-gradient-to-r ${p.tint} bg-clip-text text-transparent`}
                  >
                    {p.line2}
                  </span>
                </h2>
                <div className="mx-auto mt-10 flex items-center justify-center gap-2 text-xs text-white/50">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-px w-8 bg-white/30" />
                  <span>{String(phrases.length).padStart(2, '0')}</span>
                </div>
              </div>
            </motion.div>
          );
        })}

        <div className="absolute inset-x-8 bottom-8 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            style={{ width: progressWidth }}
            className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400"
          />
        </div>
      </div>
    </section>
  );
}
