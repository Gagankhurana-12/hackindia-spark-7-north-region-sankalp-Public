import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListFilter, BarChart3, Settings, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#FBEC6B';

const NAV = [
    { to: '/parent-dashboard/overview', label: 'Overview', Icon: LayoutDashboard, emoji: '📊' },
    { to: '/parent-dashboard/feed-control', label: 'Feed Control', Icon: ListFilter, emoji: '🎬' },
    { to: '/parent-dashboard/reports', label: 'Reports', Icon: BarChart3, emoji: '📈' },
    { to: '/parent-dashboard/settings', label: 'Settings', Icon: Settings, emoji: '⚙️' },
];

export default function Sidebar({ open, onClose }) {
    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed md:static inset-y-0 left-0 z-40 w-[240px] flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
                    ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r border-gray-200/40`}
                style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Decorative glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#FBEC6B]/20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 -right-12 w-36 h-36 rounded-full bg-pink-200/15 blur-3xl pointer-events-none" />

                <div className="relative flex items-center gap-2.5 px-6 py-7">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: ACCENT }}>
                        <Sparkles className="w-4.5 h-4.5 text-gray-800" />
                    </div>
                    <span className="text-lg font-black tracking-tight text-gray-800">Khoj</span>
                    <button
                        onClick={onClose}
                        className="md:hidden ml-auto text-gray-400 hover:text-gray-800 transition-colors"
                        aria-label="Close menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 mb-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>

                <nav className="relative flex-1 px-3 space-y-1">
                    {NAV.map(({ to, label, Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                                    isActive
                                        ? 'bg-[#FBEC6B]/40 text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                            style={{ background: '#D4A017' }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                                        isActive ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'
                                    }`} style={isActive ? { background: ACCENT } : {}}>
                                        <Icon size={16} />
                                    </div>
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="relative px-4 py-5">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-4" />
                    <div className="text-[11px] text-gray-400 tracking-wide font-medium">© 2026 Khoj</div>
                </div>
            </aside>
        </>
    );
}
