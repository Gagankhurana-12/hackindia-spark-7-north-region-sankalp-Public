import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Clock, Play, TrendingUp, Brain, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import InterestBars from './InterestBars';
import ConversationLogItem from './ConversationLogItem';

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
];

const METRIC_CONFIG = [
    { key: 'totalMinutes', label: 'Minutes watched', Icon: Clock, iconBg: 'bg-violet-500' },
    { key: 'totalVideos', label: 'Videos watched', Icon: Play, iconBg: 'bg-blue-500' },
    { key: 'avgEngagementScore', label: 'Avg engagement', Icon: TrendingUp, iconBg: 'bg-emerald-500', suffix: '%' },
    { key: 'totalFactsLearned', label: 'Facts learned', Icon: Brain, iconBg: 'bg-amber-500' },
];

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

function MetricCard({ value, label, Icon, iconBg, index }) {
    return (
        <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: index * 0.07 }}
            whileHover={{ y: -2, scale: 1.01 }}
            className="group relative overflow-hidden rounded-2xl border-2 border-white/60 p-5 hover:border-[#FBEC6B] transition-all duration-300 cursor-default"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}
        >
            <div className="flex items-start justify-between">
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

const shortDate = (k) => {
    if (!k) return '';
    const [, m, d] = k.split('-');
    return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
};

export default function ReportsTab({ childId, childName }) {
    const { token } = useAuth();
    const [period, setPeriod] = useState('week');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!token || !childId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/reports?childId=${childId}&period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed to load report');
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [token, childId, period]);

    useEffect(() => { load(); }, [load]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                    Loading report...
                </div>
            </div>
        );
    }
    if (error) return <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 font-medium">{error}</div>;
    if (!data) return null;

    const dailyChart = data.dailyBreakdown.map((d) => ({ ...d, label: shortDate(d.date) }));

    return (
        <div className="space-y-6">
            <div className="inline-flex p-1 rounded-2xl border-2 border-white/60" style={{ background: 'rgba(255,255,255,0.5)' }}>
                {PERIODS.map(({ key, label }) => (
                    <button key={key} onClick={() => setPeriod(key)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                            period === key ? 'text-gray-800 shadow-md' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        style={period === key ? { background: '#FBEC6B' } : {}}
                    >{label}</button>
                ))}
            </div>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {METRIC_CONFIG.map((m, i) => (
                    <MetricCard key={m.key} value={m.suffix ? `${data.summary[m.key]}${m.suffix}` : data.summary[m.key]} label={m.label} Icon={m.Icon} iconBg={m.iconBg} index={i} />
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                            <Clock className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Daily watch time</h3>
                    </div>
                    <div className="px-5 pb-5" style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="reportBarGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FBEC6B" />
                                        <stop offset="100%" stopColor="#D4A017" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                                <Tooltip cursor={{ fill: 'rgba(251,236,107,0.1)' }} contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#1f2937' }} />
                                <Bar dataKey="minutes" fill="url(#reportBarGrad)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.35 }} className="rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Top concepts</h3>
                    </div>
                    {data.topConcepts.length === 0 ? (
                        <div className="px-5 pb-5 text-sm text-gray-400 py-12 text-center">No concept data yet.</div>
                    ) : (
                        <div className="px-5 pb-5" style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topConcepts} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="conceptBarGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#10B981" />
                                            <stop offset="100%" stopColor="#06B6D4" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="concept" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip cursor={{ fill: 'rgba(16,185,129,0.1)' }} contentStyle={{ borderRadius: 12, border: '2px solid #e5e7eb', fontSize: 12, background: '#fff', color: '#1f2937' }} />
                                    <Bar dataKey="count" fill="url(#conceptBarGrad)" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>
            </section>

            <InterestBars childName={childName} items={data.interestTrend} />

            <motion.section {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.45 }} className="rounded-2xl border-2 border-white/60 overflow-hidden hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg">
                        <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">AI conversation logs</h3>
                </div>
                <div className="px-5 pb-5">
                    {data.conversationLogs.length === 0 ? (
                        <div className="text-sm text-gray-400 py-8 text-center">No AI conversations in this period.</div>
                    ) : (
                        <div className="space-y-2">
                            {data.conversationLogs.map((log, i) => (
                                <ConversationLogItem key={i} log={log} />
                            ))}
                        </div>
                    )}
                </div>
            </motion.section>
        </div>
    );
}
