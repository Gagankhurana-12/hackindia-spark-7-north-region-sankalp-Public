import React, { forwardRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { motion } from 'framer-motion';
import { Sparkles, Terminal, Activity, Zap, Cpu } from 'lucide-react';

// ── Shared Page Styling ──
const Page = forwardRef(({ children, ageMode, className = "" }, ref) => {
    const isBuilder = ageMode === 'builder';

    return (
        <div className={`page overflow-hidden ${className} ${isBuilder ? 'bg-slate-900 shadow-[inset_-2px_0_10px_rgba(0,0,0,0.5)]' : 'bg-[#fffef7] shadow-inner'}`} ref={ref}>
            <div className="page-content h-full w-full flex flex-col p-10 sm:p-14 relative border-x border-gray-100/10">

                {/* Background Visuals for interactivity */}
                {isBuilder ? (
                    <>
                        {/* Tech Grid Overlay */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        {/* Scanning Line */}
                        <motion.div
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-[1px] bg-sky-500/30 blur-sm pointer-events-none z-0"
                        />
                    </>
                ) : (
                    <>
                        {/* Paper Texture */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
                        {/* Floating Sparkles */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-20 -right-20 w-64 h-64 bg-violet-200/20 blur-[100px] rounded-full"
                        />
                    </>
                )}

                <div className="relative z-10 h-full flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
});

const BookSlider = ({ mission, ageMode }) => {
    if (!mission) return null;
    const isBuilder = ageMode === 'builder';

    return (
        <div className="flex items-center justify-center w-full h-full p-4 overflow-hidden">
            <HTMLFlipBook
                width={400}
                height={550}
                size="stretch"
                minWidth={315}
                maxWidth={500}
                minHeight={400}
                maxHeight={700}
                maxShadowOpacity={0.6}
                showCover={true}
                mobileScrollSupport={true}
                className="shadow-2xl rounded-3xl"
            >
                {/* ── PAGE 1: THE DYNAMIC COVER ── */}
                <div className="page cover" ref={null}>
                    <div className={`page-content h-full w-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden transition-colors duration-700 ${isBuilder
                        ? 'bg-slate-950 text-sky-400 border-l-[12px] border-slate-800'
                        : 'bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white border-l-[12px] border-black/20'
                        }`}>

                        {/* Mode-Specific Background Effects */}
                        {isBuilder ? (
                            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                                <div className="absolute top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                <motion.div
                                    animate={{ opacity: [0.1, 0.4, 0.1] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-0 bg-gradient-to-t from-sky-900/20 to-transparent"
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 8, repeat: Infinity }}
                                    className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 blur-[80px] rounded-full"
                                />
                            </div>
                        )}

                        <motion.div
                            animate={isBuilder ? {} : { y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="relative mb-10"
                        >
                            <div className="text-[120px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                {isBuilder ? <Cpu size={120} className="stroke-[1.5px]" /> : '📒'}
                            </div>
                        </motion.div>

                        <div className="space-y-1 relative">
                            <h1 className={`text-4xl font-black tracking-tighter uppercase ${isBuilder ? 'text-white' : 'text-white'}`}>
                                {isBuilder ? 'SYSTEM' : 'ACTIVITY'}
                            </h1>
                            <h1 className={`text-5xl font-black tracking-tighter uppercase opacity-30 ${isBuilder ? 'text-sky-500' : 'text-white'}`}>
                                {isBuilder ? 'PROTOCOL' : 'BOOK'}
                            </h1>
                        </div>

                        <div className={`mt-12 h-1 w-20 rounded-full ${isBuilder ? 'bg-sky-500/50' : 'bg-white/20'}`} />

                        <div className="mt-12 text-center">
                            <p className={`text-[10px] font-black uppercase tracking-[0.5em] animate-pulse ${isBuilder ? 'text-sky-400' : 'text-white/60'}`}>
                                {isBuilder ? 'Initialize _' : 'Tap to Begin ✨'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── PAGE 2: THE ADAPTIVE SUMMARY ── */}
                <Page ageMode={ageMode}>
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">

                        {isBuilder ? (
                            <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
                                <Terminal className="w-4 h-4 text-sky-400" />
                                <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">Operation Objective</span>
                            </div>
                        ) : (
                            <div className="text-6xl animate-bounce">
                                ✨
                            </div>
                        )}

                        <h2 className={`text-3xl font-black tracking-tight leading-none ${isBuilder ? 'text-white' : 'text-gray-900'}`}>
                            {mission.title}
                        </h2>

                        <div className={`p-8 rounded-[2.5rem] border-2 relative group overflow-hidden ${isBuilder
                            ? 'bg-slate-800/30 border-slate-700 text-slate-300'
                            : 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 text-amber-900'
                            }`}>
                            {isBuilder && <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-12 h-12" /></div>}
                            <p className={`text-xl font-black italic leading-tight ${isBuilder ? 'font-mono' : ''}`}>
                                "{mission.curiosityHook}"
                            </p>
                        </div>

                        <p className={`text-xs font-black uppercase tracking-[0.2em] transition-opacity ${isBuilder ? 'text-slate-500' : 'text-violet-400'}`}>
                            {isBuilder ? 'Proceed to next directive >' : 'Flip the page to start!'}
                        </p>
                    </div>
                </Page>

                {/* ── COMMAND PAGES (Themed Icons & Layout) ── */}
                {mission.instructions.map((item, idx) => (
                    <Page key={idx} ageMode={ageMode}>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-10">
                                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${isBuilder
                                    ? 'bg-slate-800/50 border-slate-700 text-slate-400'
                                    : 'bg-white border-violet-100 text-violet-400 shadow-sm'
                                    }`}>
                                    {isBuilder ? `Directive ${idx + 1}` : `Part ${idx + 1}`}
                                </div>
                                {isBuilder && <Zap className="w-4 h-4 text-sky-500 animate-pulse" />}
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: isBuilder ? 0 : 5 }}
                                    className={`w-36 h-36 rounded-[3rem] flex items-center justify-center text-8xl shadow-2xl transition-all duration-300 ${isBuilder ? 'bg-slate-800 border-2 border-sky-500/30 text-white' : 'bg-white border-4 border-violet-50'
                                        }`}
                                >
                                    {item.icon}
                                </motion.div>

                                <div className="space-y-6">
                                    <h4 className={`text-[11px] font-black uppercase tracking-[0.5em] ${isBuilder ? 'text-sky-500/70' : 'text-violet-400'}`}>
                                        {item.label}
                                    </h4>
                                    <p className={`text-2xl font-black leading-tight tracking-tight ${isBuilder ? 'text-white font-mono' : 'text-gray-900'}`}>
                                        {item.step}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto pt-10 border-t border-white/5 text-center">
                                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isBuilder ? 'text-slate-600' : 'text-violet-200'}`}>
                                    {idx === mission.instructions.length - 1 ? 'End of Mission' : 'Flip Page to Advance'}
                                </p>
                            </div>
                        </div>
                    </Page>
                ))}

                {/* ── BACK COVER ── */}
                <div className="page cover" ref={null}>
                    <div className={`page-content h-full w-full flex flex-col items-center justify-center p-12 text-center border-r-[12px] ${isBuilder
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-gradient-to-br from-indigo-900 to-violet-950 border-black/10 text-white'
                        }`}>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`text-[100px] mb-8 ${isBuilder ? 'text-sky-500 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]' : 'opacity-20'}`}
                        >
                            {isBuilder ? <Activity size={100} /> : '💎'}
                        </motion.div>
                        <h3 className="text-2xl font-black uppercase tracking-[0.3em] mb-4">
                            {isBuilder ? 'MISSION LOGGED' : 'WELL DONE!'}
                        </h3>
                        <p className={`text-[10px] font-black uppercase tracking-[0.5em] ${isBuilder ? 'text-slate-500' : 'opacity-40'}`}>
                            {isBuilder ? 'Connection Closed' : 'Adventure Complete'}
                        </p>
                    </div>
                </div>
            </HTMLFlipBook>
        </div>
    );
};

export default BookSlider;
