'use client';

import { useSecurity } from '@/context/SecurityContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import LoginPage from '@/app/login/page';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, theme } = useSecurity();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Prevent hydration mismatch by waiting until mounted
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-black" suppressHydrationWarning />; // Empty placeholder during hydration
    }

    const isPublicPath = pathname === '/login' || pathname === '/signup';

    if (!isAuthenticated && !isPublicPath) {
        return <main className="flex-1 w-full bg-black min-h-screen"><LoginPage /></main>;
    }

    if (!isAuthenticated && isPublicPath) {
        return <main className="flex-1 w-full bg-black min-h-screen">{children}</main>;
    }



    return (
        <div className={`flex w-full min-h-screen ${theme === 'dark' ? 'dark bg-black text-white' : 'bg-white text-gray-900'}`}>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:ml-80 transition-all duration-300 w-full min-w-0">
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>

    );
}
