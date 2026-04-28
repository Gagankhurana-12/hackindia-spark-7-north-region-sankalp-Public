import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Sparkles } from 'lucide-react';

function AnimatedCounter({ target, duration = 2 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, target, { duration, ease: 'easeOut' });
    const unsub = rounded.on('change', v => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [count, target, duration, rounded]);

  return <span>{display}</span>;
}

const stats = [
  { value: 127849, label: 'Children Protected', suffix: '+' },
  { value: 2500000, label: 'Hours of Safe Content', suffix: '+' },
  { value: 98, label: 'Parent Satisfaction', suffix: '%' },
  { value: 45, label: 'Countries', suffix: '+' },
];

const columns = [
  { title: 'Product', links: ['Features', 'Pricing', 'Parents App', 'Kids App', 'Schools'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Press Kit', 'Contact'] },
  { title: 'Resources', links: ['Help Center', 'Safety Guide', 'Privacy Policy', 'Terms', 'Trust & Safety'] },
];

export default function ImpactFooter() {
  const [hasAnimated, setHasAnimated] = useState(false);

  return (
    <footer className="relative overflow-hidden bg-[#010828]">
      <div className="relative bg-gradient-to-b from-[#0a1628] to-[#010828] px-4 py-20">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-indigo-400/30"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
              animate={{ y: [0, -50, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: (i % 5) * 0.4 }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            onViewportEnter={() => setHasAnimated(true)}
          >
            <h2 className="mb-4 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl lg:text-6xl">
              Making a{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                difference.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Every day, families are turning brain-rot hours into growth hours.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
              >
                <div className="mb-2 text-4xl font-black text-white md:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                    {hasAnimated ? <AnimatedCounter target={s.value} /> : '0'}
                  </span>
                  <span className="text-2xl md:text-3xl">{s.suffix}</span>
                </div>
                <div className="text-sm text-slate-400 md:text-base">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <div className="inline-block rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-emerald-500/10 p-8">
              <h3 className="mb-4 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                Our mission
              </h3>
              <p className="max-w-3xl text-lg text-slate-300 md:text-xl">
                A digital world where every child can explore, learn, and grow safely.{' '}
                <span className="font-semibold text-emerald-300">
                  Age-appropriate. Interest-specific. Always protected.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <span className="font-khoj text-3xl text-white">Khoj</span>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Transforming screen time into learning time. Protecting curious minds everywhere.
              </p>
            </div>

            {columns.map(col => (
              <div key={col.title}>
                <h4 className="mb-4 font-bold text-white">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-400 transition hover:text-white">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Khoj. All rights reserved.</p>
            <p className="text-xs text-slate-600">Made with love for families everywhere.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
