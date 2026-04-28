import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const scoreColor = (score) => {
    if (score >= 70) return 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200';
    if (score >= 40) return 'bg-amber-50 text-amber-600 border-2 border-amber-200';
    return 'bg-gray-100 text-gray-400 border-2 border-gray-200';
};

export default function ConversationLogItem({ log }) {
    const [open, setOpen] = useState(false);
    const Chev = open ? ChevronDown : ChevronRight;

    return (
        <div className="border-2 border-white/60 rounded-2xl overflow-hidden hover:border-[#FBEC6B] transition-colors" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                    <Chev className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? 'text-gray-800' : 'text-gray-400'}`} />
                    <div className="min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-700 truncate">{log.videoTitle}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{fmtDate(log.startedAt)} · {log.messages.length} messages</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {log.factsEmbedded?.length > 0 && (
                        <span className="text-[11px] text-gray-400 hidden sm:inline">{log.factsEmbedded.length} facts</span>
                    )}
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${scoreColor(log.engagementScore)}`}>
                        {log.engagementScore}% engaged
                    </span>
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-4 py-4 border-t border-gray-200/50 space-y-3" style={{ background: 'rgba(255,255,255,0.3)' }}>
                            <div className="space-y-2">
                                {log.messages.map((m, i) => {
                                    const isAI = m.role === 'assistant';
                                    return (
                                        <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                isAI ? 'bg-white/80 text-gray-700 border-2 border-white/60' : 'text-gray-800 shadow-sm'
                                            }`} style={!isAI ? { background: '#FBEC6B' } : {}}>
                                                {m.content}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {log.factsEmbedded?.length > 0 && (
                                <div className="pt-3 border-t border-gray-200/50">
                                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Facts learned</div>
                                    <ul className="space-y-1.5">
                                        {log.factsEmbedded.map((fact, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <span>{fact}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
