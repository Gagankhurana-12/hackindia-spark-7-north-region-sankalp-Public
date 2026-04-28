import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const gradientFor = (score) => {
    if (score > 70) return 'from-emerald-400 to-teal-400';
    if (score >= 40) return 'from-amber-400 to-orange-400';
    return 'from-slate-500 to-slate-500';
};

export default function InterestBars({ childName, items }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden hover:bg-white/[0.05] transition-all duration-300 backdrop-blur-sm"
        >
            <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">What {childName} is curious about</h3>
            </div>
            <div className="px-5 pb-5">
                {items.length === 0 ? (
                    <div className="text-sm text-white/30 py-8 text-center">No interest signal yet — check back after a few sessions.</div>
                ) : (
                    <div className="space-y-3 mt-2">
                        {items.map(({ topic, score }, i) => (
                            <motion.div
                                key={topic}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="grid grid-cols-[140px_1fr_40px] gap-3 items-center"
                            >
                                <span className="text-sm text-white/80 capitalize truncate font-semibold">{topic}</span>
                                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(4, score)}%` }}
                                        transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                                        className={`h-full rounded-full bg-gradient-to-r ${gradientFor(score)}`}
                                    />
                                </div>
                                <span className="text-xs font-bold text-white/50 tabular-nums text-right">{score}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.section>
    );
}
