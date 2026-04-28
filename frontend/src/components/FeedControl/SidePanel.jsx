import { useMemo, useState } from 'react';
import { Hash, Film, X, ExternalLink, Plus, Clock, Sparkles, Play } from 'lucide-react';

const fmtMin = (s) => {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
};

const fmtAgo = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const POPULAR_INTERESTS = [
    'space', 'dinosaurs', 'robotics', 'science', 'art',
    'music', 'math', 'history', 'animals', 'coding', 'nature', 'puzzles',
];

const ACCENT = '#FBEC6B';

function InterestPill({ value, onRemove, busy }) {
    return (
        <span className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold capitalize border-2 border-[#FBEC6B] text-gray-700" style={{ background: 'rgba(251,236,107,0.2)' }}>
            {value}
            <button onClick={onRemove} disabled={busy} className="opacity-40 hover:opacity-100 hover:text-rose-500 disabled:opacity-20 transition-all" title="Remove">
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

export default function SidePanel({
    interests,
    suggestions,
    recentWatched = [],
    onAddInterest,
    onRemoveInterest,
    removingInterest,
}) {
    const [draft, setDraft] = useState('');
    const [adding, setAdding] = useState(false);
    const [quickBusy, setQuickBusy] = useState(null);

    const lowerSet = useMemo(() => new Set((interests || []).map((s) => s.toLowerCase())), [interests]);
    const quickAdds = useMemo(
        () => POPULAR_INTERESTS.filter((t) => !lowerSet.has(t)).slice(0, 6),
        [lowerSet]
    );

    const submit = async (e) => {
        e.preventDefault();
        const val = draft.trim();
        if (!val || adding) return;
        setAdding(true);
        try {
            await onAddInterest(val);
            setDraft('');
        } catch { /* parent surfaces flash */ }
        finally { setAdding(false); }
    };

    const quickAdd = async (val) => {
        if (quickBusy) return;
        setQuickBusy(val);
        try { await onAddInterest(val); }
        catch { /* parent surfaces flash */ }
        finally { setQuickBusy(null); }
    };

    return (
        <aside className="space-y-4">
            {/* Interests */}
            <section className="rounded-2xl border-2 border-white/60 p-5 hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: ACCENT }}>
                            <Hash className="w-4 h-4 text-gray-800" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Current interests</h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{interests.length}</span>
                </div>

                <form onSubmit={submit} className="flex items-center gap-2 mb-3">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="e.g. space, dinosaurs"
                        maxLength={40}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-[#FBEC6B] focus:ring-2 focus:ring-[#FBEC6B]/30 outline-none text-sm bg-white placeholder:text-gray-300 text-gray-800 transition-colors"
                        disabled={adding}
                    />
                    <button type="submit" disabled={adding || !draft.trim()}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-800 shadow-md hover:shadow-lg disabled:opacity-40 transition-all"
                        style={{ background: ACCENT }} title="Add interest">
                        <Plus className="w-4 h-4" />
                    </button>
                </form>

                {interests.length === 0 ? (
                    <p className="text-sm text-gray-400 mb-3">No interests yet — add one or ask the AI.</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {interests.map((i) => (
                            <InterestPill key={i} value={i} onRemove={() => onRemoveInterest(i)} busy={removingInterest === i} />
                        ))}
                    </div>
                )}

                {quickAdds.length > 0 && (
                    <div className="pt-3 border-t border-gray-200/60">
                        <div className="flex items-center gap-1.5 mb-2.5 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                            <Sparkles className="w-3 h-3" /> Quick add
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {quickAdds.map((t) => (
                                <button key={t} onClick={() => quickAdd(t)} disabled={quickBusy === t}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/60 text-gray-500 text-[11px] font-medium hover:bg-[#FBEC6B]/20 hover:text-gray-700 border-2 border-white/60 hover:border-[#FBEC6B] disabled:opacity-50 capitalize transition-all duration-200">
                                    <Plus className="w-3 h-3" /> {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Watch history */}
            <section className="rounded-2xl border-2 border-white/60 p-5 hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                            <Clock className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Watch history</h3>
                    </div>
                    {recentWatched.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{recentWatched.length}</span>
                    )}
                </div>
                {recentWatched.length === 0 ? (
                    <div className="py-6 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                            <Play className="w-4 h-4 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">No watch activity yet.</p>
                    </div>
                ) : (
                    <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1 -mr-1">
                        {recentWatched.map((v) => (
                            <li key={v.videoId}>
                                <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer"
                                    className="flex items-start gap-2.5 group p-1.5 -m-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                                    {v.thumbnail ? (
                                        <img src={v.thumbnail} alt="" loading="lazy"
                                            className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100 ring-1 ring-gray-200"
                                            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                                    ) : (
                                        <div className="w-16 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-gray-700 line-clamp-2 group-hover:text-gray-900 transition-colors">
                                            {v.title || v.videoId}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                            {v.channel || 'Unknown'} · {fmtAgo(v.updatedAt)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 capitalize truncate">
                                            {v.topic || 'unknown'} · paused {fmtMin(v.lastWatchedTime)}
                                        </div>
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Shared videos */}
            <section className="rounded-2xl border-2 border-white/60 p-5 hover:border-[#FBEC6B] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-3.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg">
                        <Film className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">Videos you shared</h3>
                </div>
                {suggestions.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-400">Paste a YouTube link in chat to seed similar recommendations.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {suggestions.map((s) => (
                            <li key={s._id}>
                                <a href={s.url} target="_blank" rel="noreferrer"
                                    className="flex items-start gap-2 text-sm text-gray-500 hover:text-gray-800 min-w-0 p-1.5 -m-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    <span className="truncate">{s.title || s.videoId}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </aside>
    );
}
