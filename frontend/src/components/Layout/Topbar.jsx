import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronDown, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChildren } from '../../context/ChildContext';

const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

const ACCENT = '#FBEC6B';

function Avatar({ child, size = 36 }) {
    const initials = (child?.name || '?').trim().charAt(0).toUpperCase();
    return (
        <span
            className="inline-flex items-center justify-center rounded-full font-bold ring-2 ring-white shadow-sm"
            style={{ backgroundColor: child?.avatarColor || ACCENT, color: '#1f2937', width: size, height: size, fontSize: size / 2.4 }}
        >
            {initials}
        </span>
    );
}

export default function Topbar({ onMenuClick }) {
    const { parent, logout } = useAuth();
    const { children, selectedChild, setSelectedChild } = useChildren();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <header className="h-16 border-b border-gray-200/50 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-3.5 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
                <div className="min-w-0">
                    <h2 className="text-sm md:text-base font-bold text-gray-800 truncate">
                        {greet()}, {parent?.name?.split(' ')[0] || 'there'} 👋
                    </h2>
                    <p className="text-[11px] text-gray-400 hidden sm:block font-medium">Parent Dashboard</p>
                </div>
            </div>

            <div className="flex items-center gap-3" ref={ref}>
                {selectedChild ? (
                    <div className="relative">
                        <button
                            onClick={() => setOpen((v) => !v)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all duration-200 ${
                                open
                                    ? 'bg-[#FBEC6B]/20 border-[#FBEC6B] shadow-sm'
                                    : 'bg-white/60 border-gray-200 hover:border-[#FBEC6B] hover:bg-[#FBEC6B]/10'
                            }`}
                        >
                            <Avatar child={selectedChild} size={30} />
                            <div className="hidden sm:block text-left">
                                <div className="text-sm font-bold text-gray-800 leading-tight">{selectedChild.name}</div>
                                <div className="text-[10px] text-gray-400">Age {selectedChild.age}</div>
                            </div>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {open && children.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-60 border-2 border-gray-200 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden"
                                    style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)' }}
                                >
                                    <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Switch child</span>
                                    </div>
                                    {children.map((c) => {
                                        const active = c._id === selectedChild._id;
                                        return (
                                            <button
                                                key={c._id}
                                                onClick={() => { setSelectedChild(c); setOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                                                    active ? 'bg-[#FBEC6B]/20' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <Avatar child={c} size={28} />
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className={`font-bold truncate ${active ? 'text-gray-800' : 'text-gray-600'}`}>{c.name}</div>
                                                    <div className="text-[10px] text-gray-400">Age {c.age} · Lvl {c.level || 1}</div>
                                                </div>
                                                {active && <Check size={14} className="text-gray-800 flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">No child profile</span>
                )}

                <div className="w-px h-6 bg-gray-200 hidden sm:block" />

                <button
                    onClick={logout}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Sign out"
                    aria-label="Sign out"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}
