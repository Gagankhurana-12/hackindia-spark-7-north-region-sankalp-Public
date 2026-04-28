import { Check, SkipForward, Trash2, Gift } from 'lucide-react';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-600 border-2 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200',
    skipped: 'bg-gray-100 text-gray-400 border-2 border-gray-200',
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

export default function TaskCard({ task, onComplete, onSkip, onDelete, busy }) {
    return (
        <div className="group border-2 border-white/60 rounded-2xl p-4.5 hover:border-[#FBEC6B] transition-all duration-200" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-800 truncate">{task.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[task.status]}`}>
                            {task.status}
                        </span>
                    </div>
                    {task.description && (
                        <p className="mt-1 text-sm text-gray-500 leading-relaxed">{task.description}</p>
                    )}
                    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border-2 border-emerald-200">
                            <Gift className="w-3 h-3" /> +{task.rewardMinutes} min screen time
                        </span>
                        <span>Assigned {fmtDate(task.assignedAt)}</span>
                        {task.completedAt && <span>· done {fmtDate(task.completedAt)}</span>}
                    </div>
                </div>
                <button onClick={() => onDelete(task)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete task">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {task.status === 'pending' && (
                <div className="mt-3.5 flex items-center gap-2">
                    <button onClick={() => onComplete(task)} disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-800 text-sm font-bold hover:brightness-105 shadow-md disabled:opacity-60 transition-all duration-200"
                        style={{ background: '#FBEC6B' }}>
                        <Check className="w-4 h-4" /> Mark complete
                    </button>
                    <button onClick={() => onSkip(task)} disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-gray-400 text-sm font-medium hover:bg-gray-100 disabled:opacity-60 transition-colors">
                        <SkipForward className="w-4 h-4" /> Skip
                    </button>
                </div>
            )}
        </div>
    );
}
