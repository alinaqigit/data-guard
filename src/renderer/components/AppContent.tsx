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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return <div className="min-h-screen" style={{ background: '#000000' }} suppressHydrationWarning />;
    }

    const isPublicPath = pathname === '/login' || pathname === '/signup';

    if (!isAuthenticated && !isPublicPath) {
        return <main className="flex-1 w-full min-h-screen" style={{ background: '#000000' }}><LoginPage /></main>;
    }
    if (!isAuthenticated && isPublicPath) {
        return <main className="flex-1 w-full min-h-screen" style={{ background: '#000000' }}>{children}</main>;
    }

    // Sidebar total width: 264px expanded, 64px collapsed (both include 10px padding each side)
    const mainMargin = sidebarCollapsed ? '68px' : '260px';

    return (
        <div className="flex w-full min-h-screen" style={{ background: '#000000', color: '#FFFFFF' }}>
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
            />

            <div
                className="flex-1 flex flex-col w-full min-w-0"
                style={{
                    marginLeft: mainMargin,
                    transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden w-full max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}