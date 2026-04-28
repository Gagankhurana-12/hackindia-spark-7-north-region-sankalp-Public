import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Toddler, Explorer, Learner, Achiever } from './characters.jsx';

const ageGroups = [
  {
    age: '2-5', label: 'Sensory',
    badgeColor: 'bg-[#FF3388]',
    textColor: 'text-[#FF3388]',
    bg: 'bg-pink-500/10',
    Char: Toddler,
    features: ['Shapes & colors', 'Sing-along rhymes', 'Gentle stories'],
    description: 'Playful, colorful, voice-led. The mentor whispers warm facts and celebrates every tiny win.',
  },
  {
    age: '6-12', label: 'Functional',
    badgeColor: 'bg-[#FFB800]',
    textColor: 'text-[#FFB800]',
    bg: 'bg-yellow-500/10',
    Char: Explorer,
    features: ['Reading quests', 'Math games', 'Mini experiments'],
    description: 'Curiosity-first. Every video turns into a puzzle — the mentor poses questions, then reveals the "why".',
  },
  {
    age: '13-16', label: 'Specialist',
    badgeColor: 'bg-[#00D084]',
    textColor: 'text-[#00D084]',
    bg: 'bg-emerald-500/10',
    Char: Learner,
    features: ['STEM projects', 'Coding basics', 'Creative writing'],
    description: 'Focused and structured. The mentor bridges trending content to real-world skills and critical thinking.',
  },
  {
    age: '17-20', label: 'Achiever',
    badgeColor: 'bg-[#4466FF]',
    textColor: 'text-[#4466FF]',
    bg: 'bg-blue-500/10',
    Char: Achiever,
    features: ['Deep dives', 'Career paths', 'Leadership'],
    description: 'Advanced conversations, nuanced facts, and a voice that respects their growing independence.',
  },
];

export default function CharacterEvolution() {
  const ref = useRef(null);
  const [active, setActive] = useState(1);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const lineProgress = useTransform(scrollYProgress, [0.2, 0.8], ['0%', '100%']);

  const ActiveChar = ageGroups[active].Char;

  return (
    <section id="characters" ref={ref} className="relative overflow-hidden bg-[#0A0F1E] px-4 py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-[#0B1021] px-4 py-1.5 text-sm font-medium text-indigo-200">
            <span className="h-2 w-2 rounded-full bg-[#4466FF]" />
            Age-adaptive mentor
          </div>
          <h2 className="mb-6 text-4xl font-black uppercase leading-[1.1] tracking-tight text-white md:text-6xl lg:text-[80px]">
            A FRIEND WHO
            <br />
            <span className="bg-gradient-to-r from-[#FF3388] via-[#FFB800] via-[#00D084] to-[#4466FF] bg-clip-text text-transparent">
              GROWS WITH THEM.
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-300 md:text-xl">
            The mentor's voice, vocabulary and depth shift at every stage — the character evolves with the child.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-1/2 hidden h-[2px] bg-[#1C2640] md:block -translate-y-1/2 z-0" />
          <div className="absolute left-0 right-0 top-1/2 hidden h-[2px] md:block -translate-y-1/2 z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF3388] via-[#FFB800] via-[#00D084] to-[#4466FF]"
              style={{ width: lineProgress }}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4 relative z-10">
            {ageGroups.map((g, i) => (
              <motion.div
                key={g.age}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="relative"
              >
                <motion.button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`relative block w-full cursor-pointer rounded-2xl pt-8 pb-6 px-6 text-center transition-all duration-300 border ${
                    active === i
                      ? 'bg-[#2A2A2A] border-white/10 shadow-xl scale-[1.02]'
                      : 'bg-[#0B1021] border-[#1C2640] hover:bg-[#11172A]'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white shadow-lg ${g.badgeColor}`}>
                    {g.age} yrs
                  </div>
                  <motion.div
                    className="mx-auto my-6 h-20 w-20 flex items-center justify-center"
                    animate={active === i ? { y: [0, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <g.Char />
                  </motion.div>
                  <h3 className={`text-lg font-bold ${g.textColor}`}>
                    {g.label}
                  </h3>
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <div className="mx-auto max-w-3xl rounded-3xl border border-[#333] bg-[#222] p-8 md:p-10 shadow-2xl">
            <div className="flex flex-col items-center gap-8 md:flex-row md:gap-10">
              <motion.div
                className="h-28 w-28 flex-shrink-0"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <ActiveChar />
              </motion.div>
              <div className="flex-1 text-center md:text-left">
                <h4 className={`mb-3 text-2xl font-bold ${ageGroups[active].textColor}`}>
                  {ageGroups[active].label} Stage · Ages {ageGroups[active].age}
                </h4>
                <p className="mb-6 text-slate-300 md:text-lg leading-relaxed">{ageGroups[active].description}</p>
                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  {ageGroups[active].features.map(f => (
                    <span key={f} className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm font-medium text-slate-200">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
