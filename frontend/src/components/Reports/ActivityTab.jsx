import { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Clock, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import TaskCard from './TaskCard';

const startOfWeek = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d;
};

const METRIC_CONFIG = [
    { key: 'completed', label: 'Completed this week', Icon: CheckCircle2, iconBg: 'bg-emerald-500' },
    { key: 'pending', label: 'Pending', Icon: Clock, iconBg: 'bg-amber-500' },
    { key: 'reward', label: 'Reward earned this week', Icon: Gift, iconBg: 'bg-violet-500' },
];

function MetricCard({ value, label, Icon, iconBg, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.07 }}
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

export default function ActivityTab({ childId }) {
    const { token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', rewardMinutes: 15 });
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        if (!token || !childId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/activity?childId=${childId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed to load tasks');
            setTasks(json.tasks || []);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [token, childId]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSubmitting(true);
        const optimistic = {
            _id: `tmp_${Date.now()}`,
            title: form.title.trim(),
            description: form.description.trim(),
            rewardMinutes: Number(form.rewardMinutes) || 0,
            status: 'pending',
            assignedAt: new Date().toISOString(),
        };
        setTasks((prev) => [optimistic, ...prev]);
        setForm({ title: '', description: '', rewardMinutes: 15 });
        try {
            const res = await fetch('/api/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ childId, ...optimistic }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Failed');
            setTasks((prev) => prev.map((t) => (t._id === optimistic._id ? json.task : t)));
        } catch (err) {
            setTasks((prev) => prev.filter((t) => t._id !== optimistic._id));
            setError(err.message);
        } finally { setSubmitting(false); }
    };

    const patch = async (id, op) => {
        setBusyId(id);
        const prev = tasks;
        const nextStatus = op === 'complete' ? 'completed' : 'skipped';
        setTasks((cur) => cur.map((t) => (t._id === id ? { ...t, status: nextStatus, completedAt: op === 'complete' ? new Date().toISOString() : t.completedAt } : t)));
        try {
            const res = await fetch(`/api/activity/${id}/${op}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
        } catch { setTasks(prev); }
        finally { setBusyId(null); }
    };

    const remove = async (task) => {
        if (!window.confirm(`Delete "${task.title}"?`)) return;
        const prev = tasks;
        setTasks((cur) => cur.filter((t) => t._id !== task._id));
        try {
            const res = await fetch(`/api/activity/${task._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
        } catch { setTasks(prev); }
    };

    const weekStart = startOfWeek();
    const completedThisWeek = tasks.filter((t) => t.status === 'completed' && new Date(t.completedAt || 0) >= weekStart);
    const pending = tasks.filter((t) => t.status === 'pending');
    const skipped = tasks.filter((t) => t.status === 'skipped');
    const completedAll = tasks.filter((t) => t.status === 'completed');
    const totalRewardMinutes = completedThisWeek.reduce((a, t) => a + (t.rewardMinutes || 0), 0);
    const Chev = showCompleted ? ChevronDown : ChevronRight;

    const metricValues = [completedThisWeek.length, pending.length, `${totalRewardMinutes} min`];

    return (
        <div className="space-y-6">
            <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleSubmit}
                className="border-2 border-white/60 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}
            >
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Task name (e.g. Watch one space video)"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" required />
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" />
                <input type="number" min={0} max={180} value={form.rewardMinutes} onChange={(e) => setForm((f) => ({ ...f, rewardMinutes: e.target.value }))}
                    placeholder="Reward min"
                    className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" />
                <button type="submit" disabled={submitting}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-gray-800 text-sm font-bold hover:brightness-105 shadow-lg disabled:opacity-60 transition-all duration-200"
                    style={{ background: '#FBEC6B' }}>
                    <Plus className="w-4 h-4" /> Assign task
                </button>
            </motion.form>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {METRIC_CONFIG.map((m, i) => (
                    <MetricCard
                        key={m.key}
                        value={metricValues[i]}
                        label={m.label}
                        Icon={m.Icon}
                        iconBg={m.iconBg}
                        index={i}
                    />
                ))}
            </section>

            {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-3 font-medium">{error}</div>}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                        Loading tasks...
                    </div>
                </div>
            )}

            <section className="space-y-3">
                {pending.length === 0 && !loading && (
                    <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl" style={{ background: 'rgba(255,255,255,0.3)' }}>No pending tasks. Assign one above.</div>
                )}
                {pending.map((t) => <TaskCard key={t._id} task={t} onComplete={(x) => patch(x._id, 'complete')} onSkip={(x) => patch(x._id, 'skip')} onDelete={remove} busy={busyId === t._id} />)}
                {skipped.map((t) => <TaskCard key={t._id} task={t} onComplete={(x) => patch(x._id, 'complete')} onSkip={(x) => patch(x._id, 'skip')} onDelete={remove} busy={busyId === t._id} />)}
            </section>

            {completedAll.length > 0 && (
                <section>
                    <button
                        onClick={() => setShowCompleted((v) => !v)}
                        className="w-full flex items-center justify-between px-5 py-3.5 border-2 border-white/60 rounded-2xl hover:border-[#FBEC6B] transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.5)' }}
                    >
                        <span className="text-sm font-bold text-gray-800">{completedAll.length} task{completedAll.length === 1 ? '' : 's'} completed</span>
                        <Chev className={`w-4 h-4 transition-colors ${showCompleted ? 'text-gray-800' : 'text-gray-400'}`} />
                    </button>
                    {showCompleted && (
                        <div className="mt-3 space-y-3">
                            {completedAll.map((t) => <TaskCard key={t._id} task={t} onComplete={() => {}} onSkip={() => {}} onDelete={remove} busy={busyId === t._id} />)}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
