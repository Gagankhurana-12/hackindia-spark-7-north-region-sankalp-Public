import { Clock, PlayCircle, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const ACCENT = '#FBEC6B';

function Stat({ Icon, value, label, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08, duration: 0.4 }}
            className="flex items-center gap-3 min-w-0"
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-white/60 shadow-sm"
                style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
                <Icon className="w-4.5 h-4.5 text-gray-700" />
            </div>
            <div className="min-w-0">
                <div className="text-xl font-extrabold text-gray-800 tabular-nums leading-tight tracking-tight">{value}</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 truncate font-semibold">{label}</div>
            </div>
        </motion.div>
    );
}

export default function StatsHero({ childName, stats, lastVideo }) {
    const topTopic = stats?.topTopics?.[0]?.topic;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-3xl p-6 md:p-8 border-2 border-white/60"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)' }}
        >
            {/* Decorative orbs */}
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#FBEC6B]/20 blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 top-0 w-32 h-32 rounded-full bg-pink-200/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-12 w-40 h-40 rounded-full bg-sky-200/15 blur-3xl pointer-events-none" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-2 font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live snapshot
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-800">Tuning {childName}&apos;s feed</h1>
                    <p className="text-sm text-gray-500 mt-1.5 max-w-md leading-relaxed">
                        Chat with the AI co-pilot to add interests, share YouTube links, or pull a quick activity idea.
                    </p>
                </div>
                {topTopic && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-700 capitalize border-2 border-[#FBEC6B]"
                        style={{ background: 'rgba(251,236,107,0.3)' }}
                    >
                        <Sparkles className="w-3 h-3 inline mr-1.5 text-amber-500" />
                        Strongest pull: {topTopic}
                    </motion.div>
                )}
            </div>

            <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-5">
                <Stat Icon={PlayCircle} value={stats?.totalVideos ?? 0} label="Videos" index={0} />
                <Stat Icon={Clock} value={`${stats?.totalMinutes ?? 0}m`} label="Watched" index={1} />
                <Stat Icon={MessageCircle} value={stats?.aiInteractions ?? 0} label="AI chats" index={2} />
                <Stat Icon={Sparkles} value={(stats?.topTopics || []).length} label="Active topics" index={3} />
            </div>

            {lastVideo?.title && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="relative mt-6 flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-white/60"
                    style={{ background: 'rgba(255,255,255,0.5)' }}
                >
                    {lastVideo.thumbnail ? (
                        <img src={lastVideo.thumbnail} alt="" className="w-16 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-gray-200" />
                    ) : (
                        <div className="w-16 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Most recent</div>
                        <div className="text-sm text-gray-700 truncate font-medium mt-0.5">{lastVideo.title}</div>
                        {lastVideo.topic && (
                            <div className="text-[10px] text-gray-400 capitalize mt-0.5">topic: {lastVideo.topic}</div>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
