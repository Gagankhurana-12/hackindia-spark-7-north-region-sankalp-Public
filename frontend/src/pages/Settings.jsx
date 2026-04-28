import { useState } from 'react';
import { Plus, Copy, Check, UserPlus, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChildren } from '../context/ChildContext';
import AddChildModal from '../components/Settings/AddChildModal';

const LANG_LABEL = { english: 'English', hindi: 'हिन्दी' };

export default function Settings() {
    const { token } = useAuth();
    const { children, loading, error, refresh } = useChildren();
    const [showAdd, setShowAdd] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const copyCode = async (id, code) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch (_) { /* noop */ }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <motion.header
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-wrap items-end justify-between gap-4 mb-6"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Settings</h1>
                    <p className="text-gray-400 mt-1 text-sm font-medium">Manage child profiles and link codes.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-800 font-bold text-sm hover:brightness-105 shadow-lg transition-all duration-200"
                    style={{ background: '#FBEC6B' }}
                >
                    <Plus className="w-4 h-4" /> Add child
                </button>
            </motion.header>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-2xl border-2 border-white/60 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}
            >
                <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.4)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: '#FBEC6B' }}>
                            <SettingsIcon className="w-4 h-4 text-gray-800" />
                        </div>
                        <h2 className="font-bold text-gray-800">Child profiles</h2>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{children.length} {children.length === 1 ? 'profile' : 'profiles'}</span>
                </div>

                {loading && children.length === 0 ? (
                    <div className="p-16 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                            Loading profiles...
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-600 text-sm bg-red-50 font-medium">{error}</div>
                ) : children.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <UserPlus className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-gray-800 font-bold">No children yet</p>
                        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">Add your first child to start tracking learning activity.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 text-left text-[11px] uppercase tracking-widest font-bold" style={{ background: 'rgba(255,255,255,0.3)' }}>
                                    <th className="px-6 py-3">Child</th>
                                    <th className="px-6 py-3">Age</th>
                                    <th className="px-6 py-3">Language</th>
                                    <th className="px-6 py-3">Interests</th>
                                    <th className="px-6 py-3">Link code</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {children.map((c) => (
                                    <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm"
                                                    style={{ backgroundColor: c.avatarColor || '#FBEC6B', color: '#1f2937' }}
                                                >
                                                    {c.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-semibold">{c.age}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border-2 border-[#FBEC6B] text-gray-600" style={{ background: 'rgba(251,236,107,0.2)' }}>
                                                {LANG_LABEL[c.language] || 'English'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.interests?.length ? (
                                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                    {c.interests.slice(0, 4).map((i) => (
                                                        <span key={i} className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-medium">{i}</span>
                                                    ))}
                                                    {c.interests.length > 4 && (
                                                        <span className="text-[11px] text-gray-400 font-medium">+{c.interests.length - 4}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => copyCode(c._id, c.linkCode)}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-[11px] tracking-wider transition-all duration-200 ${
                                                    copiedId === c._id
                                                        ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200'
                                                        : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[#FBEC6B] hover:bg-[#FBEC6B]/10'
                                                }`}
                                            >
                                                {c.linkCode}
                                                {copiedId === c._id ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.section>

            {showAdd && (
                <AddChildModal
                    token={token}
                    onClose={() => setShowAdd(false)}
                    onAdded={async () => {
                        setShowAdd(false);
                        await refresh();
                    }}
                />
            )}
        </div>
    );
}
