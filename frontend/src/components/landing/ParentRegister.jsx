import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const benefits = [
  'Personalized content based on age and interests',
  'Real-time parental controls and insights',
  'Safe, ad-free learning environment',
  'Weekly growth reports delivered to your inbox',
];

function ParentChildArt() {
  return (
    <motion.svg
      viewBox="0 0 150 150"
      className="h-40 w-40"
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <ellipse cx="60" cy="90" rx="40" ry="35" fill="url(#pGrad)" />
      <circle cx="48" cy="80" r="5" fill="#1a1a2e" />
      <circle cx="72" cy="80" r="5" fill="#1a1a2e" />
      <circle cx="49" cy="78" r="2" fill="white" />
      <circle cx="73" cy="78" r="2" fill="white" />
      <path d="M48 95 Q60 105 72 95" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="70" rx="25" ry="22" fill="url(#cGrad)" />
      <circle cx="92" cy="65" r="4" fill="#1a1a2e" />
      <circle cx="108" cy="65" r="4" fill="#1a1a2e" />
      <circle cx="93" cy="63" r="1.5" fill="white" />
      <circle cx="109" cy="63" r="1.5" fill="white" />
      <path d="M92 78 Q100 84 108 78" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <motion.path
        d="M130 40 C125 35 118 38 118 45 C118 52 130 60 130 60 C130 60 142 52 142 45 C142 38 135 35 130 40"
        fill="#ff6b9d"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ transformOrigin: '130px 50px' }}
      />
      <defs>
        <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#FF8E53" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

export default function ParentRegister() {
  const navigate = useNavigate();

  return (
    <section id="register" className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] to-[#010828] px-4 py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Join the movement
            </div>

            <h2 className="mb-6 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl lg:text-6xl">
              Start your
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                child's journey.
              </span>
            </h2>

            <p className="mb-8 max-w-lg text-lg text-slate-300">
              Create a family account in under a minute. Pick your child's age band and
              interests — the mentor adapts from the first video.
            </p>

            <div className="mb-10 space-y-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20">
                    <svg className="h-4 w-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-200">{b}</span>
                </motion.div>
              ))}
            </div>

            <div className="hidden lg:block">
              <ParentChildArt />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <h3 className="mb-2 text-2xl font-bold text-white">Pick a door.</h3>
              <p className="mb-8 text-slate-400">
                Parents get a dashboard. Kids get a mentor. Both roles use the same household account.
              </p>

              <div className="space-y-4">
                <motion.button
                  onClick={() => navigate('/parent-auth')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full overflow-hidden rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 p-6 text-left transition hover:border-indigo-400/60"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-200">
                        I'm a parent
                      </div>
                      <div className="text-xl font-bold text-white">Create family account</div>
                      <p className="mt-2 text-sm text-slate-300">
                        Add children, set age bands, see growth reports weekly.
                      </p>
                    </div>
                    <span className="text-2xl text-indigo-200 transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/child-auth')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20 p-6 text-left transition hover:border-fuchsia-400/60"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-fuchsia-200">
                        I'm a kid
                      </div>
                      <div className="text-xl font-bold text-white">Jump into the feed</div>
                      <p className="mt-2 text-sm text-slate-300">
                        Your mentor is already warmed up. Pick a video and go.
                      </p>
                    </div>
                    <span className="text-2xl text-fuchsia-200 transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </motion.button>
              </div>

              <p className="mt-6 text-center text-xs text-slate-500">
                By continuing you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
