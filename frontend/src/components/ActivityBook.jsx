import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import BookSlider from './ui/book-slider';

export default function ActivityBook() {
    const [isOpen, setIsOpen] = useState(false);
    const [mission, setMission] = useState(null);
    const [loading, setLoading] = useState(false);
    const childAge = Number(localStorage.getItem('childAge')) || 10;
    const isTeen = childAge > 9;

    const fetchMission = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('childToken');
            const res = await fetch('/api/missions/daily', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.mission) {
                setMission(data.mission);
            }
        } catch (err) {
            console.error('Failed to fetch mission:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleModal = () => {
        if (!isOpen) {
            fetchMission();
        }
        setIsOpen(!isOpen);
    };

    const ageMode = mission?.ageMode || 'explorer';

    return (
        <>
            {/* ── Floating Icon ── */}
            <motion.div
                className="fixed bottom-6 right-6 z-50 cursor-pointer group"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                onClick={toggleModal}
            >
                <div className={`absolute inset-0 blur-2xl opacity-40 group-hover:opacity-70 transition-opacity animate-pulse ${isTeen ? '' : 'bg-violet-400'}`}
                    style={isTeen ? { background: '#FBEC6B' } : {}} />
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`relative w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden transform group-hover:rotate-12 transition-transform ${isTeen ? 'border-2' : 'border-4 border-white/20 bg-gradient-to-br from-violet-500 to-fuchsia-600'}`}
                    style={isTeen ? { background: '#FBEC6B', borderColor: 'rgba(251,236,107,0.6)' } : {}}
                >
                    <BookOpen className={`w-8 h-8 ${isTeen ? 'text-gray-900' : 'text-white'}`} />
                </motion.div>
            </motion.div>

            {/* ── Magical Modal ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-lg"
                    >
                        <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

                        {/* ── THE BOOK SLIDER CONTAINER ── */}
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            className="relative z-10 w-full max-w-lg h-[650px] flex items-center justify-center"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute -top-16 right-0 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className="w-16 h-16 border-4 rounded-full animate-spin"
                                        style={isTeen ? { borderColor: 'rgba(251,236,107,0.2)', borderTopColor: '#FBEC6B' } : { borderColor: 'rgba(255,107,107,0.2)', borderTopColor: '#FF6B6B' }} />
                                    <p className="font-black" style={{ color: isTeen ? '#FBEC6B' : '#FF6B6B' }}>OPENING BOOK...</p>
                                </div>
                            ) : mission ? (
                                <div className="w-full h-full">
                                    <BookSlider
                                        mission={mission}
                                        ageMode={ageMode}
                                    />
                                </div>
                            ) : (
                                <p className="text-white">Could not load activity book.</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
