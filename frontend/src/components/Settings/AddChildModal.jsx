import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const LANGS = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिन्दी (Hindi)' },
];

export default function AddChildModal({ token, onClose, onAdded }) {
    const [form, setForm] = useState({ name: '', age: 8, interests: '', language: 'english' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const trimmedName = form.name.trim();
        if (trimmedName.length < 2) return setError('Name must be at least 2 characters.');
        const ageNum = Number(form.age);
        if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 17) return setError('Age must be between 3 and 17.');

        setSubmitting(true);
        try {
            const res = await fetch('/api/auth/add-child', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: trimmedName,
                    age: ageNum,
                    interests: form.interests,
                    language: form.language,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to add child');
            onAdded?.(data.child);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-white/60"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: '#FBEC6B' }}>
                            <UserPlus className="w-4 h-4 text-gray-800" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Add a child</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Name</label>
                        <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Aarav"
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Age</label>
                        <input type="number" min={3} max={17} value={form.age} onChange={(e) => update('age', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Interests</label>
                        <input type="text" value={form.interests} onChange={(e) => update('interests', e.target.value)} placeholder="space, dinosaurs, coding"
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors" />
                        <p className="text-[11px] text-gray-400 mt-1.5">Comma-separated.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Language</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LANGS.map((l) => (
                                <button key={l.value} type="button" onClick={() => update('language', l.value)}
                                    className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                                        form.language === l.value
                                            ? 'border-[#FBEC6B] text-gray-800 shadow-sm'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                    style={form.language === l.value ? { background: 'rgba(251,236,107,0.3)' } : {}}>
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 px-4 py-2.5 rounded-xl font-medium">{error}</div>}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-400 hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-800 font-bold text-sm shadow-md hover:brightness-105 disabled:opacity-60 transition-all duration-200"
                            style={{ background: '#FBEC6B' }}>
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? 'Adding...' : 'Add child'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
