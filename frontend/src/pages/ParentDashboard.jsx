import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import Topbar from '../components/Layout/Topbar';

export default function ParentDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex text-gray-800"
            style={{ background: 'linear-gradient(150deg, #FFF9DB 0%, #FEF3C7 25%, #FFFBEB 50%, #FEFCE8 75%, #FFF7ED 100%)' }}>
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
