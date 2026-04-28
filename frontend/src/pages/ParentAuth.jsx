import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Lock, Mail, User, Phone, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const childAvatars = ['/Name=01.png', '/Name=103.png', '/Name=188.png', '/Name=244.png', '/Name=52.png', '/Name=60.png', '/Name=88.png'];
const ACCENT = '#FBEC6B';
const INPUT_CLS = 'block w-full rounded-2xl border-2 border-gray-200 bg-white py-3 px-4 text-gray-800 font-medium placeholder:text-gray-400 focus:border-[#FBEC6B] focus:outline-none focus:ring-2 focus:ring-[#FBEC6B]/40 text-sm transition';
const INPUT_ICON_CLS = 'block w-full rounded-2xl border-2 border-gray-200 bg-white py-3 pl-11 pr-4 text-gray-800 font-medium placeholder:text-gray-400 focus:border-[#FBEC6B] focus:outline-none focus:ring-2 focus:ring-[#FBEC6B]/40 text-sm transition';

const stepAnim = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25 },
};

const ConfettiExplosion = () => {
  const colors = ['#FF6B6B', '#FBEC6B', '#A78BFA', '#38BDF8', '#6EE7B7', '#F97316', '#EC4899'];
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <style>{`@keyframes cfall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
      {Array.from({ length: 80 }).map((_, i) => (
        <div key={i} className="absolute w-2 h-4 rounded-sm"
          style={{ left: `${Math.random()*100}%`, top: `${-15+Math.random()*10}%`,
            backgroundColor: colors[i%colors.length],
            animation: `cfall ${2.5+Math.random()*2}s ${Math.random()*1.5}s linear forwards` }} />
      ))}
    </div>
  );
};

export default function ParentAuth() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [parentData, setParentData] = useState({ name: '', email: '', password: '', phone: '' });
  const [preferences, setPreferences] = useState({ style: 'balanced', monitorActivity: false, aiMentor: true });
  const [childData, setChildData] = useState({ name: '', age: '', interests: '', language: 'english' });
  const [linkCode, setLinkCode] = useState('');

  const [childAvatar, setChildAvatar] = useState('/Name=01.png');
  const [parentAvatar, setParentAvatar] = useState('/Name=38.png');

  useEffect(() => {
    setChildAvatar(childAvatars[Math.floor(Math.random() * childAvatars.length)]);
    setParentAvatar(Math.random() > 0.5 ? '/Name=38.png' : '/Name=71.png');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parentData.email, password: parentData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed');

      setSession({ token: data.token, parent: data.parent });
      navigate('/parent-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const interestsArray = childData.interests.split(',').map(i => i.trim()).filter(Boolean);
      
      const payload = {
        parentData: {
          name: parentData.name,
          email: parentData.email,
          password: parentData.password,
          phone: parentData.phone,
        },
        preferences,
        childrenData: [{
          name: childData.name,
          age: Number(childData.age),
          interests: interestsArray,
          language: childData.language
        }]
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Registration failed');

      setSession({ token: data.token, parent: data.parent });

      const firstChildCode = data.childrenAccounts?.[0]?.linkCode || data.children?.[0]?.linkCode;
      if (firstChildCode) {
        setLinkCode(firstChildCode);
      } else {
        navigate('/parent-dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (linkCode) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #FFF9DB, #FEF3C7, #FFFBEB, #FFF7ED)' }}>
        <ConfettiExplosion />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md rounded-3xl border-2 border-[#FBEC6B]/60 p-8 text-center shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg" style={{ background: ACCENT }}>
            <CheckCircle2 className="h-9 w-9 text-gray-800" />
          </div>
          <h2 className="mt-6 text-3xl font-black text-gray-800">You're All Set! 🎉</h2>
          <p className="mt-2 text-gray-500 font-medium">Share this code with your child to start their journey:</p>
          <div className="my-6 rounded-2xl border-2 border-[#FBEC6B] p-4 font-mono text-4xl font-black tracking-[0.4em] text-gray-800"
            style={{ background: 'rgba(251,236,107,0.2)' }}>
            {linkCode}
          </div>
          <button onClick={() => navigate('/parent-dashboard')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-gray-800 transition hover:brightness-105 shadow-lg"
            style={{ background: ACCENT }}>
            Go to Dashboard <ChevronRight className="h-5 w-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  const stepTitles = {
    1: 'Create an Account',
    2: 'Parenting Preferences',
    3: 'Child Details',
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #FFF9DB 0%, #FEF3C7 25%, #FFFBEB 50%, #FFF7ED 75%, #FEFCE8 100%)' }}>

      {/* Soft floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-48 h-48 rounded-full bg-[#FBEC6B]/30 blur-3xl animate-pulse" />
        <div className="absolute top-[60%] right-[10%] w-56 h-56 rounded-full bg-pink-200/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[5%] left-[30%] w-40 h-40 rounded-full bg-violet-200/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Logo */}
      <button onClick={() => navigate('/')} className="absolute left-6 top-6 z-20">
        <span className="text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Khoj</span>
      </button>

      {/* Left: Illustration (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative z-10">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
          className="w-full max-w-lg">
          <img src="/image.png" alt="Parent and child illustration" className="w-full h-auto drop-shadow-2xl rounded-3xl" />
          <div className="mt-8 text-center">
            <h2 className="text-3xl font-black text-gray-800 leading-tight">Shape Their World,<br/><span style={{ color: '#D4A017' }}>One Video at a Time</span></h2>
            <p className="mt-3 text-gray-500 font-medium text-sm max-w-md mx-auto">Join thousands of parents who trust Khoj to make screen time meaningful, safe, and full of wonder ✨</p>
          </div>
        </motion.div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-3xl border-2 border-white/60 p-8 sm:p-10 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)' }}>

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black tracking-tight text-gray-800">
            {isLogin ? 'Welcome Back 👋' : (step === 1 ? 'Create Account ✨' : step === 2 ? 'Your Preferences 🎯' : 'Tell Us About Your Child 🧒')}
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            {isLogin ? 'Sign in to your parent dashboard' : `Step ${step} of 3 — Almost there!`}
          </p>
          {!isLogin && (
            <div className="flex justify-center gap-2 mt-4">
              {[1,2,3].map(s => (
                <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s <= step ? 'w-10' : 'w-6'}`}
                  style={{ background: s <= step ? ACCENT : '#E5E7EB' }} />
              ))}
            </div>
          )}
        </div>

        {error && <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600 font-bold">{error}</div>}

        {isLogin ? (
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4.5 w-4.5 text-gray-400" />
                <input type="email" required className={INPUT_ICON_CLS} placeholder="parent@example.com"
                  value={parentData.email} onChange={e => setParentData({ ...parentData, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-gray-400" />
                <input type="password" required className={INPUT_ICON_CLS} placeholder="••••••••"
                  value={parentData.password} onChange={e => setParentData({ ...parentData, password: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex w-full justify-center rounded-2xl px-3 py-3.5 text-sm font-bold text-gray-800 shadow-lg transition hover:brightness-105 disabled:opacity-50"
              style={{ background: ACCENT }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-800/30 border-t-gray-800 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); step < 3 ? setStep(step + 1) : handleSignup(); }}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#FBEC6B] shadow-lg">
                    <img src={parentAvatar} alt="Parent Avatar" className="h-full w-full object-cover bg-gray-50" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Your Profile</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="text" required className={INPUT_ICON_CLS} placeholder="Your name"
                      value={parentData.name} onChange={e => setParentData({ ...parentData, name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="email" required className={INPUT_ICON_CLS} placeholder="parent@example.com"
                      value={parentData.email} onChange={e => setParentData({ ...parentData, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="tel" className={INPUT_ICON_CLS} placeholder="+91 98765 43210"
                      value={parentData.phone} onChange={e => setParentData({ ...parentData, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
                    <input type="password" required className={INPUT_ICON_CLS} placeholder="••••••••"
                      value={parentData.password} onChange={e => setParentData({ ...parentData, password: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-3 block text-sm font-bold text-gray-600">Parenting Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[{v:'strict',e:'🛡️'},{v:'balanced',e:'⚖️'},{v:'fun',e:'🎉'}].map(s => (
                      <button key={s.v} type="button" onClick={() => setPreferences({ ...preferences, style: s.v })}
                        className={`rounded-2xl border-2 py-3 text-sm font-bold capitalize transition-all ${preferences.style === s.v ? 'border-[#FBEC6B] bg-[#FBEC6B]/20 text-gray-800 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-[#FBEC6B]/50'}`}>
                        <span className="text-lg block">{s.e}</span>{s.v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#FBEC6B]/60 transition">
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-[#D4A017] focus:ring-[#FBEC6B]"
                      checked={preferences.monitorActivity} onChange={e => setPreferences({...preferences, monitorActivity: e.target.checked})} />
                    <span className="text-sm font-bold text-gray-700">🔒 Monitor Activity Privately</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 hover:border-[#FBEC6B]/60 transition">
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-[#D4A017] focus:ring-[#FBEC6B]"
                      checked={preferences.aiMentor} onChange={e => setPreferences({...preferences, aiMentor: e.target.checked})} />
                    <span className="text-sm font-bold text-gray-700">✨ Enable Spark AI Mentor</span>
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#FBEC6B] shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setChildAvatar(childAvatars[Math.floor(Math.random() * childAvatars.length)])}>
                    <img src={childAvatar} alt="Child Avatar" className="h-full w-full object-cover bg-gray-50" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">🎲 Shuffle</div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Child Profile</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Child's Name</label>
                  <input type="text" required className={INPUT_CLS} placeholder="e.g. Aarav" value={childData.name} onChange={e => setChildData({ ...childData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Age</label>
                  <input type="number" required className={INPUT_CLS} placeholder="4" value={childData.age} onChange={e => setChildData({ ...childData, age: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1.5">Interests</label>
                  <input type="text" className={INPUT_CLS} placeholder="Space, Dinosaurs, Art ✨" value={childData.interests} onChange={e => setChildData({ ...childData, interests: e.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-600">Language</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ value: 'english', label: 'English', sub: 'Aa' }, { value: 'hindi', label: 'Hindi', sub: 'अ' }].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setChildData({ ...childData, language: opt.value })}
                        className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold transition-all ${childData.language === opt.value ? 'border-[#FBEC6B] bg-[#FBEC6B]/20 text-gray-800 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-[#FBEC6B]/50'}`}>
                        <span className="text-base font-black">{opt.sub}</span>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <button type="button" onClick={() => setStep(step - 1)}
                  className="w-1/3 rounded-2xl border-2 border-gray-200 bg-white px-3 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">
                  ← Back
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3.5 text-sm font-bold text-gray-800 shadow-lg transition hover:brightness-105 disabled:opacity-50"
                style={{ background: ACCENT }}>
                {step === 3 ? (loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-800/30 border-t-gray-800 rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : '🎉 Finish') : 'Continue →'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm">
          <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="font-bold text-gray-500 transition hover:text-gray-800">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: '#D4A017' }}>{isLogin ? 'Sign up' : 'Sign in'}</span>
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
}