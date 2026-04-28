import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Brain, Zap, Rocket, Sparkles } from 'lucide-react';

const problems = [
  {
    icon: <Brain className="h-6 w-6" />,
    text: 'Shrinking attention spans from endless shorts',
    tint: 'from-rose-500/20 to-red-500/20',
    border: 'border-rose-500/30',
    ic: 'text-rose-300',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    text: 'Dopamine loops that never teach anything',
    tint: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    ic: 'text-amber-300',
  },
  {
    icon: <Rocket className="h-6 w-6" />,
    text: 'Curiosity replaced by passive scrolling',
    tint: 'from-fuchsia-500/20 to-pink-500/20',
    border: 'border-fuchsia-500/30',
    ic: 'text-fuchsia-300',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    text: 'Parents locked out of what kids actually watch',
    tint: 'from-cyan-500/20 to-sky-500/20',
    border: 'border-cyan-500/30',
    ic: 'text-cyan-300',
  },
];

const marqueeWords = [
  'Stop the scroll.',
  'Start the spark.',
  'Turn screen time into brain time.',
  'Every pause is a lesson.',
  'Curiosity is the new algorithm.',
];

function Marquee() {
  const row = [...marqueeWords, ...marqueeWords];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-6">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-12 text-2xl font-black uppercase tracking-tight text-white/80 md:text-3xl"
          >
            {w}
            <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function ProblemSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-slate-950 py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/60 to-transparent" />

      <div className="mb-20">
        <Marquee />
      </div>

      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            The problem parents feel every day
          </div>

          <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-5xl lg:text-6xl">
            <span className="block">Why scrolling</span>
            <span className="block bg-gradient-to-r from-rose-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
              is eating their minds.
            </span>
          </h2>

          <p className="mt-6 max-w-lg text-lg text-slate-300">
            The average child watches 1,300 short videos a week. Almost none of
            them teach anything. Khoj rewires that loop — without
            removing the fun.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              3.2h daily avg screen time
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              47% drop in focused reading
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              0 parental context
            </span>
          </div>
        </motion.div>

        <motion.div className="space-y-4" style={{ x }}>
          {problems.map((p, i) => (
            <motion.div
              key={i}
              className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-r p-5 backdrop-blur-xl ${p.tint} ${p.border}`}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, x: -6 }}
            >
              <div className={p.ic}>{p.icon}</div>
              <span className="text-base font-bold uppercase tracking-tight text-white md:text-lg">
                {p.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
