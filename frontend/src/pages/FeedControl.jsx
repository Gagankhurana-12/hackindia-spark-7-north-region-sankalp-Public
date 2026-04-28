import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Film, Loader2, BarChart3, ShieldCheck, ShieldAlert, Check, Bot, MessageSquare, PieChart as PieChartIcon, Zap, BookOpen, Play } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChildren } from '../context/ChildContext';
import SidePanel from '../components/FeedControl/SidePanel';
import StatsHero from '../components/FeedControl/StatsHero';

const QUICK_PROMPTS = [
    { label: 'Weekly summary', icon: BarChart3, prompt: 'Please summarize my child\'s recent watch history and tell me if it\'s helping their growth, then suggest one activity we can do together.' },
    { label: 'Activity idea', icon: Sparkles, prompt: 'Suggest one fun 10-minute real-world activity based on what my child has been watching this week.' },
    { label: 'Recommend a video', icon: Film, prompt: 'Recommend one safe YouTube video that builds on the topics my child already enjoys.' },
    { label: 'Learning report', icon: BookOpen, prompt: 'Give me a detailed learning report for my child based on their recent activity.' },
];

const PIE_COLORS_FC = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E', '#A855F7'];

const ACCENT = '#FBEC6B';

function ActionPill({ action }) {
    if (action.type === 'add_interest') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">+ interest: {action.payload?.value}</span>;
    }
    if (action.type === 'remove_interest') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">&minus; {action.payload?.value}</span>;
    }
    if (action.type === 'add_video') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"><ShieldCheck className="w-3 h-3" /> video queued</span>;
    }
    if (action.type === 'block_video') {
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200" title={action.payload?.reason || ''}><ShieldAlert className="w-3 h-3" /> video blocked</span>;
    }
    return null;
}

function Bubble({ msg }) {
    const isAI = msg.role === 'assistant';
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
        >
            <div className="max-w-[80%]">
                {isAI && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: ACCENT }}>
                            <Bot className="w-3 h-3 text-gray-800" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Agent</span>
                    </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    isAI
                        ? 'bg-white/80 border-2 border-white/60 text-gray-700'
                        : 'text-gray-800 shadow-md'
                }`} style={!isAI ? { background: ACCENT } : {}}>
                    {msg.content}
                </div>
                {msg.actions?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.actions.map((a, i) => <ActionPill key={i} action={a} />)}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function FeedControl() {
    const { token } = useAuth();
    const { selectedChild, refresh: refreshChildren } = useChildren();
    const [messages, setMessages] = useState([]);
    const [interests, setInterests] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [recentWatched, setRecentWatched] = useState([]);
    const [stats, setStats] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [removingInterest, setRemovingInterest] = useState(null);
    const [flash, setFlash] = useState(null);
    const [activeView, setActiveView] = useState('chat'); // 'chat' | 'graphs'
    const scrollerRef = useRef(null);
    const flashTimerRef = useRef(null);

    const childId = selectedChild?._id;

    const showFlash = useCallback((kind, text) => {
        setFlash({ kind, text });
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlash(null), 2400);
    }, []);

    useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);

    const load = useCallback(async () => {
        if (!token || !childId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/feed-control/thread?childId=${childId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed to load');
            setMessages(json.messages || []);
            setInterests(json.interests || []);
            setSuggestions(json.suggestions || []);
            setRecentWatched(json.recentWatched || []);
            setStats(json.stats || null);
            setError(null);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [token, childId]);

    useEffect(() => {
        setMessages([]); setInterests([]); setSuggestions([]); setRecentWatched([]); setStats(null);
        load();
    }, [load]);

    useEffect(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }, [messages, sending]);

    const send = async (text) => {
        const content = (text ?? input).trim();
        if (!content || sending || !childId) return;
        setActiveView('chat');
        const optimisticUser = { _id: `tmp_${Date.now()}`, role: 'user', content };
        setMessages((prev) => [...prev, optimisticUser]);
        setInput('');
        setSending(true);
        try {
            const res = await fetch('/api/feed-control/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ childId, content }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed');
            setMessages((prev) => [...prev, json.message]);
            setInterests(json.interests || interests);
            setSuggestions(json.suggestions || suggestions);
            const acts = json.message?.actions || [];
            if (acts.some((a) => a.type === 'add_interest' || a.type === 'remove_interest')) refreshChildren();
            if (acts.some((a) => a.type === 'block_video')) {
                showFlash('error', 'Video blocked — not safe / age-appropriate.');
            } else if (acts.some((a) => a.type === 'add_video')) {
                showFlash('success', 'Video reviewed and queued.');
            } else if (acts.some((a) => a.type === 'add_interest')) {
                const added = acts.filter((a) => a.type === 'add_interest').map((a) => a.payload?.value).filter(Boolean).join(', ');
                if (added) showFlash('success', `Added: ${added}`);
            }
            load();
        } catch (e) {
            setMessages((prev) => prev.filter((m) => m._id !== optimisticUser._id));
            setError(e.message);
            showFlash('error', e.message);
        } finally { setSending(false); }
    };

    const addInterest = async (interest) => {
        const res = await fetch('/api/feed-control/interest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ childId, interest }),
        });
        const json = await res.json();
        if (!res.ok) {
            const msg = json?.message || 'Failed to add interest';
            setError(msg);
            showFlash('error', msg);
            throw new Error(msg);
        }
        setInterests(json.interests || []);
        refreshChildren();
        showFlash('success', `Added: ${interest}`);
    };

    const removeInterest = async (interest) => {
        setRemovingInterest(interest);
        try {
            const res = await fetch('/api/feed-control/interest', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ childId, interest }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed');
            setInterests(json.interests || []);
            refreshChildren();
            showFlash('info', `Removed: ${interest}`);
        } catch (e) { setError(e.message); showFlash('error', e.message); }
        finally { setRemovingInterest(null); }
    };

    if (!selectedChild) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-white/60 border-2 border-white/60 flex items-center justify-center mb-3">
                        <Bot className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Select a child to start tuning their feed.</p>
                </div>
            </div>
        );
    }

    const lastVideo = recentWatched[0];
    const flashStyles = {
        success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        info: 'bg-blue-50 text-blue-600 border-blue-200',
        error: 'bg-rose-50 text-rose-600 border-rose-200',
    };

    // Build topic data for graphs view
    const topicMap = {};
    (recentWatched || []).forEach((v) => {
        const topic = v.topic || 'Other';
        topicMap[topic] = (topicMap[topic] || 0) + 1;
    });
    const topicPieData = Object.entries(topicMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    // Watch time by video
    const watchBarData = (recentWatched || []).slice(0, 8).map((v) => ({
        name: (v.title || v.videoId || '').slice(0, 18) + ((v.title || '').length > 18 ? '...' : ''),
        minutes: Math.round((v.lastWatchedTime || 0) / 60),
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-6 relative">
            <AnimatePresence>
                {flash && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className={`fixed top-20 right-6 z-50 inline-flex items-center gap-2 px-5 py-3 rounded-2xl border-2 text-sm font-bold shadow-xl ${flashStyles[flash.kind] || flashStyles.info}`}
                        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}
                    >
                        {flash.kind === 'success' ? <Check className="w-4 h-4" /> : flash.kind === 'error' ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        {flash.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <StatsHero childName={selectedChild.name} stats={stats} lastVideo={lastVideo} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
                <section className="rounded-3xl border-2 border-white/60 flex flex-col h-[calc(100vh-360px)] min-h-[480px] overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    {/* Chat header with view toggle */}
                    <div className="px-5 py-3.5 border-b border-gray-200/50 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.5)' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: ACCENT }}>
                                <Bot className="w-4.5 h-4.5 text-gray-800" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-gray-800">FeedControl AI</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-gray-400 font-medium">Live on {selectedChild.name}&apos;s profile</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setActiveView('chat')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                                    activeView === 'chat'
                                        ? 'text-gray-800 shadow-md'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                                style={activeView === 'chat' ? { background: ACCENT } : {}}
                            >
                                <MessageSquare className="w-3.5 h-3.5" /> Chat with Agent
                            </button>
                            <button
                                onClick={() => setActiveView('graphs')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                                    activeView === 'graphs'
                                        ? 'text-gray-800 shadow-md'
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                                style={activeView === 'graphs' ? { background: ACCENT } : {}}
                            >
                                <PieChartIcon className="w-3.5 h-3.5" /> Show Graphs
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeView === 'chat' ? (
                            <motion.div
                                key="chat-view"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Messages */}
                                <div ref={scrollerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-16">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                                                <span className="text-sm text-gray-400 font-medium">Reading {selectedChild.name}&apos;s profile...</span>
                                            </div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex items-center justify-center py-16">
                                            <div className="text-center">
                                                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(251,236,107,0.3)' }}>
                                                    <Zap className="w-7 h-7 text-gray-600" />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-800 mb-1">Start a conversation</h3>
                                                <p className="text-sm text-gray-400 max-w-xs">Ask the AI to review a video, add interests, or get activity ideas for {selectedChild.name}.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((m) => <Bubble key={m._id} msg={m} />)
                                    )}
                                    {sending && (
                                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: ACCENT }}>
                                                    <Bot className="w-3 h-3 text-gray-800" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {sending && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="px-4 py-3 rounded-2xl bg-white/80 border-2 border-white/60 text-sm text-gray-400 inline-flex items-center gap-2.5">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                Thinking...
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Quick prompts */}
                                <div className="px-5 pt-3 pb-2 flex flex-wrap gap-2 border-t border-gray-200/50" style={{ background: 'rgba(255,255,255,0.3)' }}>
                                    {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                                        <motion.button
                                            key={label}
                                            whileHover={{ scale: 1.03, y: -1 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => send(prompt)}
                                            disabled={sending}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/60 border-2 border-white/60 text-[11px] font-bold text-gray-500 hover:border-[#FBEC6B] hover:text-gray-700 hover:bg-[#FBEC6B]/20 disabled:opacity-50 transition-all duration-200"
                                        >
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Input */}
                                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t border-gray-200/50 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.3)' }}>
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Paste a YouTube link, ask for a summary, or type 'add interest robotics'..."
                                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-all"
                                        disabled={sending}
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={sending || !input.trim()}
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-800 shadow-md hover:shadow-lg disabled:opacity-40 transition-all duration-200"
                                        style={{ background: ACCENT }}
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.button>
                                </form>
                                {error && <div className="px-5 pb-3 text-xs text-red-500 font-medium">{error}</div>}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="graphs-view"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 overflow-y-auto p-5 space-y-5"
                            >
                                {/* Topic distribution pie */}
                                <div className="rounded-2xl border-2 border-white/60 p-5" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg">
                                            <PieChartIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-800">Topic Distribution</h3>
                                    </div>
                                    {topicPieData.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <PieChartIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400 font-medium">No topic data yet — watch some videos first!</p>
                                        </div>
                                    ) : (
                                        <div style={{ height: 220 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={topicPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none">
                                                        {topicPieData.map((_, i) => (
                                                            <Cell key={`c-${i}`} fill={PIE_COLORS_FC[i % PIE_COLORS_FC.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#1f2937' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    {topicPieData.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {topicPieData.map((t, i) => (
                                                <span key={t.name} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 capitalize">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS_FC[i % PIE_COLORS_FC.length] }} />
                                                    {t.name} ({t.value})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Watch time bar chart */}
                                <div className="rounded-2xl border-2 border-white/60 p-5" style={{ background: 'rgba(255,255,255,0.5)' }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg">
                                            <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-800">Watch Time by Video</h3>
                                    </div>
                                    {watchBarData.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400 font-medium">No watch data yet</p>
                                        </div>
                                    ) : (
                                        <div style={{ height: 220 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={watchBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="fcBarGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#FBEC6B" />
                                                            <stop offset="100%" stopColor="#D4A017" />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                                                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#1f2937' }} />
                                                    <Bar dataKey="minutes" fill="url(#fcBarGrad)" radius={[8, 8, 0, 0]} animationDuration={800} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* Stats summary cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Videos', value: stats?.totalVideos ?? 0, color: 'bg-blue-500' },
                                        { label: 'Minutes', value: `${stats?.totalMinutes ?? 0}m`, color: 'bg-violet-500' },
                                        { label: 'AI Chats', value: stats?.aiInteractions ?? 0, color: 'bg-emerald-500' },
                                        { label: 'Topics', value: (stats?.topTopics || []).length, color: 'bg-amber-500' },
                                    ].map((s) => (
                                        <motion.div
                                            key={s.label}
                                            whileHover={{ y: -2 }}
                                            className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-all"
                                        >
                                            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center shadow-lg`}>
                                                <span className="text-white text-xs font-bold">{typeof s.value === 'number' ? s.value : ''}</span>
                                            </div>
                                            <div>
                                                <div className="text-lg font-extrabold text-white">{s.value}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">{s.label}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                <SidePanel
                    interests={interests}
                    suggestions={suggestions}
                    recentWatched={recentWatched}
                    onAddInterest={addInterest}
                    onRemoveInterest={removeInterest}
                    removingInterest={removingInterest}
                />
            </div>
        </div>
    );
}
