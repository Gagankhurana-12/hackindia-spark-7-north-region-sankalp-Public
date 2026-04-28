import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Check, Gift, Play, Clock, Sparkles, MessageCircle, Brain, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChildren } from '../context/ChildContext';

const POLL_MS = 60000;

const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
};

const ACCENT = '#FBEC6B';

const METRIC_CONFIG = [
    { key: 'videosWatched', label: 'Videos today', Icon: Play, gradient: 'from-blue-500 to-cyan-400', iconBg: 'bg-blue-500' },
    { key: 'totalMinutes', label: 'Minutes watched', Icon: Clock, gradient: 'from-violet-500 to-purple-400', iconBg: 'bg-violet-500' },
    { key: 'aiInteractions', label: 'AI interactions', Icon: MessageCircle, gradient: 'from-emerald-500 to-teal-400', iconBg: 'bg-emerald-500' },
    { key: 'factsLearned', label: 'Facts learned', Icon: Brain, gradient: 'from-amber-500 to-orange-400', iconBg: 'bg-amber-500' },
];

const PIE_COLORS = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E', '#F97316', '#10B981', '#06B6D4'];

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

function MetricCard({ value, label, Icon, gradient, iconBg, index }) {
    return (
        <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: index * 0.07 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className="group relative overflow-hidden rounded-2xl border-2 border-white/60 p-5 hover:border-[#FBEC6B] transition-all duration-300 cursor-default"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}
        >
            <div className={`absolute top-0 right-0 w-28 h-28 -mr-8 -mt-8 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-500`} />
            <div className="flex items-start justify-between relative">
                <div>
                    <div className="text-3xl font-extrabold text-gray-800 tabular-nums tracking-tight">{value}</div>
                    <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
                </div>
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </motion.div>
    );
}

function VideoRow({ v, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-3.5 py-3 group cursor-default"
        >
            <div className="w-14 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 ring-1 ring-gray-200">
                {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Play className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900 transition-colors">{v.title}</div>
                <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${v.percentWatched}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, #FBEC6B, #D4A017)` }}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 tabular-nums w-9 text-right">{v.percentWatched}%</span>
                </div>
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">{timeAgo(v.watchedAt)}</span>
        </motion.div>
    );
}

function TaskCard({ task, onComplete, completing }) {
    if (!task) {
        return (
            <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Plus className="w-5 h-5 text-gray-300" />
                </div>
                <div className="text-sm text-gray-400 mb-3 font-medium">No task set today</div>
                <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all">
                    <Plus size={14} /> Add task
                </button>
            </div>
        );
    }
    return (
        <div>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-bold text-gray-800">{task.title}</h4>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">{task.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap border border-emerald-200">
                    <Gift size={12} /> +{task.rewardMinutes} min
                </span>
            </div>
            <button
                onClick={onComplete}
                disabled={completing || task.status === 'completed'}
                className={`mt-4 w-full inline-flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all duration-200 ${
                    task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'text-gray-800 hover:brightness-105 disabled:opacity-50 shadow-md'
                }`}
                style={task.status !== 'completed' ? { background: ACCENT } : {}}
            >
                {task.status === 'completed' ? (<><Check size={16} /> Completed</>) : completing ? 'Marking...' : 'Mark complete'}
            </button>
        </div>
    );
}

function Toast({ message }) {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-6 right-6 z-50 text-gray-800 text-sm font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-white/60"
                    style={{ background: ACCENT }}
                >
                    <Check size={16} /> {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function GiftChestItem({ gift, index }) {
    const icons = {
        rocket: '🚀', star: '⭐', diamond: '💎', crown: '👑', 'magic-box': '🎁', video: '🎬'
    };
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.06 }}
            whileHover={{ y: -2, scale: 1.02 }}
            className="group relative overflow-hidden border-2 border-white/60 rounded-2xl p-4 flex items-center gap-4 hover:border-[#FBEC6B] transition-all duration-300 cursor-default"
            style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}
        >
            <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{icons[gift.giftType] || '🎁'}</div>
            <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Like {gift.relatableThing}</div>
                <div className="text-sm font-semibold text-gray-800 truncate mt-0.5">{gift.videoTitle}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 italic">&ldquo;{gift.fact}&rdquo;</div>
            </div>
        </motion.div>
    );
}

export default function Overview() {
    const { token } = useAuth();
    const { selectedChild } = useChildren();

    const [data, setData] = useState(null);
    const [firstLoading, setFirstLoading] = useState(true);
    const [error, setError] = useState(null);
    const [completing, setCompleting] = useState(false);
    const [toast, setToast] = useState('');
    const toastTimer = useRef(null);

    const showToast = useCallback((msg) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3000);
    }, []);

    const [gifts, setGifts] = useState([]);

    const loadGifts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/gifts/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) setGifts(json.gifts || []);
        } catch (e) {
            console.warn('Failed to load gifts');
        }
    }, [token]);

    const load = useCallback(
        async (silent = false) => {
            if (!token || !selectedChild?._id) return;
            if (!silent) setFirstLoading(true);
            try {
                const res = await fetch(`/api/dashboard/overview?childId=${selectedChild._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.message || 'Failed to load overview');
                setData(json);
                setError(null);
                loadGifts();
            } catch (e) {
                if (!silent) setError(e.message);
            } finally {
                if (!silent) setFirstLoading(false);
            }
        },
        [token, selectedChild?._id, loadGifts]
    );

    useEffect(() => {
        setData(null);
        load(false);
        const id = setInterval(() => load(true), POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

    const handleComplete = async () => {
        const task = data?.activityTask;
        if (!task?._id) return;
        setCompleting(true);
        setData((prev) => (prev ? { ...prev, activityTask: { ...prev.activityTask, status: 'completed' } } : prev));
        try {
            const res = await fetch(`/api/tasks/${task._id}/complete`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to complete task');
            showToast('Completed!');
            load(true);
        } catch (e) {
            setData((prev) => (prev ? { ...prev, activityTask: { ...prev.activityTask, status: 'pending' } } : prev));
            showToast('Could not complete');
        } finally {
            setCompleting(false);
        }
    };

    if (!selectedChild) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white/60 flex items-center justify-center mb-3 border-2 border-white/60">
                        <Sparkles className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Select a child to see their overview.</p>
                </div>
            </div>
        );
    }
    if (firstLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                    Loading overview...
                </div>
            </div>
        );
    }
    if (error) {
        return <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 font-medium">{error}</div>;
    }
    if (!data) return null;

    const { todayStats, recentVideos, activityTask, weeklyMinutes } = data;

    // Build pie chart data from recent video topics
    const topicMap = {};
    (recentVideos || []).forEach((v) => {
        const topic = v.topic || 'Other';
        topicMap[topic] = (topicMap[topic] || 0) + 1;
    });
    const topicPieData = Object.entries(topicMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    // Build engagement distribution data for a donut
    const engagementData = [
        { name: 'Videos', value: todayStats.videosWatched || 0 },
        { name: 'AI Chats', value: todayStats.aiInteractions || 0 },
        { name: 'Facts', value: todayStats.factsLearned || 0 },
    ].filter((d) => d.value > 0);

    return (
        <div className="space-y-6 max-w-6xl">
            {/* A) Stats row */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {METRIC_CONFIG.map((m, i) => (
                    <MetricCard
                        key={m.key}
                        value={todayStats[m.key]}
                        label={m.label}
                        Icon={m.Icon}
                        gradient={m.gradient}
                        bg={m.bg}
                        iconBg={m.iconBg}
                        index={i}
                    />
                ))}
            </section>

            {/* B) Two-column: Videos + Task */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="lg:col-span-3 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                                <Play className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800">Recent videos</h3>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{recentVideos.length} videos</span>
                    </div>
                    <div className="px-5 pb-5">
                        {recentVideos.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                    <Play className="w-5 h-5 text-gray-300" />
                                </div>
                                <div className="text-sm text-gray-400 font-medium">No videos watched yet.</div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {recentVideos.map((v, i) => <VideoRow key={v.videoId + v.watchedAt} v={v} index={i} />)}
                            </div>
                        )}
                    </div>
                </motion.div>
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }} className="lg:col-span-2 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                            <Gift className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Today&apos;s activity task</h3>
                    </div>
                    <div className="px-5 pb-5">
                        <TaskCard task={activityTask} onComplete={handleComplete} completing={completing} />
                    </div>
                </motion.div>
            </section>

            {/* C) Charts row — Bar + Pie */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} className="lg:col-span-3 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">This week&apos;s screen time</h3>
                    </div>
                    <div className="px-5 pb-5" style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyMinutes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FBEC6B" />
                                        <stop offset="100%" stopColor="#D4A017" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                                <Tooltip cursor={{ fill: 'rgba(251,236,107,0.1)' }} contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', background: '#fff', color: '#1f2937' }} />
                                <Bar dataKey="minutes" fill="url(#barGradient)" radius={[8, 8, 0, 0]} animationDuration={800} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.45 }} className="lg:col-span-2 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg">
                            <PieChartIcon className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Topic breakdown</h3>
                    </div>
                    <div className="px-5 pb-5" style={{ height: 200 }}>
                        {topicPieData.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <PieChartIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400 font-medium">No topic data yet</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={topicPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" animationDuration={800} stroke="none">
                                        {topicPieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', background: '#fff', color: '#1f2937' }} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8}
                                        formatter={(val) => <span className="text-[11px] text-gray-500 font-medium capitalize">{val}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>
            </section>

            {/* D) Engagement donut + Gift Chest */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.5 }} className="lg:col-span-2 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Today&apos;s engagement</h3>
                    </div>
                    <div className="px-5 pb-5" style={{ height: 200 }}>
                        {engagementData.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-gray-400 font-medium">No engagement data yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={engagementData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" animationDuration={800} stroke="none">
                                        <Cell fill="#6366F1" />
                                        <Cell fill="#10B981" />
                                        <Cell fill="#F59E0B" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', background: '#fff', color: '#1f2937' }} />
                                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                                        formatter={(val) => <span className="text-[11px] text-gray-500 font-semibold">{val}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>

                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.55 }} className="lg:col-span-3 rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: ACCENT }}>
                                <Gift className="w-4 h-4 text-gray-800" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800">Gift Chest</h3>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase px-2.5 py-1 bg-[#FBEC6B]/30 rounded-full border border-[#FBEC6B]">{gifts.length} Gift{gifts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="px-5 pb-5">
                        {gifts.length === 0 ? (
                            <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl mt-2">
                                <div className="text-3xl mb-2">🎁</div>
                                <div className="text-sm text-gray-400 font-medium">Unbox gifts while watching videos to fill your chest!</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                {gifts.map((g, i) => <GiftChestItem key={g._id} gift={g} index={i} />)}
                            </div>
                        )}
                    </div>
                </motion.div>
            </section>

            <Toast message={toast} />
        </div>
    );
}
