'use client';

import { useSecurity } from '@/context/SecurityContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoginPage from '@/app/login/page';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, theme } = useSecurity();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Prevent hydration mismatch by waiting until mounted
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-black" suppressHydrationWarning />; // Empty placeholder during hydration
    }

    const isPublicPath = pathname === '/login' || pathname === '/signup';

    if (!isAuthenticated && !isPublicPath) {
        return <LoginPage />;
    }

    if (!isAuthenticated && isPublicPath) {
        return <main className="flex-1 w-full bg-black min-h-screen">{children}</main>;
    }

    return (
        <div className={`flex w-full min-h-screen ${theme === 'dark' ? 'dark bg-black text-white' : 'bg-white text-gray-900'}`}>
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300">
                <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
