import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, ArrowRight, ChevronDown, Menu, X,
} from 'lucide-react';
import ScrollRibbon from '../components/landing/ScrollRibbon.jsx';
import ProblemSection from '../components/landing/ProblemSection.jsx';
import WaterFillSection from '../components/landing/WaterFillSection.jsx';
import TopFeatures from '../components/landing/TopFeatures.jsx';
import CharacterEvolution from '../components/landing/CharacterEvolution.jsx';
import ParentRegister from '../components/landing/ParentRegister.jsx';
import ImpactFooter from '../components/landing/ImpactFooter.jsx';

// Scroll progress (0..1) across a section that is taller than the viewport.
function useSectionProgress(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        const { top, height } = el.getBoundingClientRect();
        const total = height - window.innerHeight;
        if (total <= 0) { setP(0); return; }
        setP(Math.min(1, Math.max(0, -top / total)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return y;
}

function Navbar({ navigate }) {
  const y = useScrollY();
  const [open, setOpen] = useState(false);
  const solid = y > 40;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid ? 'bg-khoj-bg/80 backdrop-blur-xl border-b border-khoj-border' : 'bg-transparent'}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <span className="font-khoj text-3xl text-white">Khoj</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-khoj-muted transition hover:text-white">Features</a>
          <a href="#characters" className="text-sm font-medium text-khoj-muted transition hover:text-white">Characters</a>
          <a href="#register" className="text-sm font-medium text-khoj-muted transition hover:text-white">For families</a>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => navigate('/get-started')}
            className="group inline-flex items-center gap-1.5 rounded-md bg-khoj-violet px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-khoj-violet/30 transition hover:bg-khoj-violet-hover"
          >
            Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <button onClick={() => setOpen(v => !v)} className="text-white md:hidden" aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-khoj-border bg-khoj-bg/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="#features" onClick={() => setOpen(false)} className="text-khoj-muted">Features</a>
            <a href="#characters" onClick={() => setOpen(false)} className="text-khoj-muted">Characters</a>
            <a href="#register" onClick={() => setOpen(false)} className="text-khoj-muted">For families</a>
            <button
              onClick={() => navigate('/get-started')}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-khoj-violet px-4 py-2.5 text-sm font-semibold text-white"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ navigate }) {
  const ref = useRef(null);
  const p = useSectionProgress(ref);
  // Scroll thresholds: headline holds 0–40%, swaps 40–45%, second copy holds 45–85%, fades 85–100%.
  const headlineOp = p < 0.40 ? 1 : p < 0.45 ? 1 - (p - 0.40) / 0.05 : 0;
  const headlineY = -Math.min(60, p * 150);
  const secondOp =
    p < 0.40 ? 0 :
    p < 0.45 ? (p - 0.40) / 0.05 :
    p < 0.85 ? 1 :
    Math.max(0, 1 - (p - 0.85) / 0.15);
  const secondY = p < 0.45 ? 40 - (p - 0.40) * 800 : 0;

  return (
    <section ref={ref} id="top" className="relative h-[220vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <video
          autoPlay muted loop playsInline preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-khoj-bg/60 via-khoj-bg/40 to-khoj-bg/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(14,14,22,0.75)_90%)]" />

        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{ opacity: headlineOp, transform: `translate3d(0, ${headlineY}px, 0)` }}
        >
          <div className="max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-khoj-border bg-white/5 px-4 py-1.5 text-xs font-medium text-khoj-text backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-khoj-teal opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-khoj-teal" />
              </span>
              Spark now live inside every video
            </div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
              Learning that <span className="font-khoj font-normal text-khoj-violet">pauses</span>
              <br /> to make you <span className="font-khoj font-normal text-khoj-teal">wonder.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-khoj-muted sm:text-xl">
              An AI-native video feed that drops curiosity hooks mid-play — shaped to your child's age band, grounded in what they're actually watching.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/get-started')}
                className="group inline-flex items-center gap-2 rounded-md bg-khoj-violet px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-khoj-violet/30 transition hover:bg-khoj-violet-hover"
              >
                Get Started <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-md border border-khoj-border bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
              >
                <PlayCircle className="h-5 w-5" /> See how it works
              </a>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{ opacity: secondOp, transform: `translate3d(0, ${secondY}px, 0)` }}
        >
          <div className="max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-khoj-teal">the wow factor</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              "Hey, did you know…?"
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-khoj-muted">
              At the perfect moment, the video pauses. Spark leans in with a fact you won't forget — then bridges you to what's next.
            </p>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-white/70"
          style={{ opacity: Math.max(0, 1 - p * 4) }}
        >
          <ChevronDown className="h-7 w-7 animate-bounce" />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('parentToken')) {
      navigate('/parent-dashboard', { replace: true });
    } else if (localStorage.getItem('childToken')) {
      navigate('/video-feed', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="bg-khoj-bg">
      <Navbar navigate={navigate} />
      <Hero navigate={navigate} />
      <ScrollRibbon />
      <ProblemSection />
      <WaterFillSection />
      <TopFeatures />
      <CharacterEvolution />
      <ParentRegister />
      <ImpactFooter />
    </div>
  );
}
