import { useState } from 'react';
import { BarChart3, ListChecks, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChildren } from '../context/ChildContext';
import ReportsTab from '../components/Reports/ReportsTab';
import ActivityTab from '../components/Reports/ActivityTab';

const TABS = [
    { key: 'reports', label: 'Reports', Icon: BarChart3 },
    { key: 'activity', label: 'Activity', Icon: ListChecks },
];

export default function Reports() {
    const { selectedChild } = useChildren();
    const [tab, setTab] = useState('reports');

    if (!selectedChild) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-white/60 border-2 border-white/60 flex items-center justify-center mb-3">
                        <TrendingUp className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Select a child to view reports.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <motion.header
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-wrap items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Insights for {selectedChild.name}</h1>
                    <p className="text-gray-400 mt-1 text-sm font-medium">Learning trends, conversations, and assigned activities.</p>
                </div>
                <div className="inline-flex p-1 rounded-2xl border-2 border-white/60" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    {TABS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                                tab === key
                                    ? 'text-gray-800 shadow-md'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                            style={tab === key ? { background: '#FBEC6B' } : {}}
                        >
                            <Icon className="w-4 h-4" /> {label}
                        </button>
                    ))}
                </div>
            </motion.header>

            {tab === 'reports' ? (
                <ReportsTab childId={selectedChild._id} childName={selectedChild.name} />
            ) : (
                <ActivityTab childId={selectedChild._id} />
            )}
        </div>
    );
}
