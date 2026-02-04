'use client';

import {
    LayoutDashboard,
    FileSearch,
    ShieldCheck,
    Bell,
    ScrollText,
    BarChart3,
    ShieldAlert,
    User,
    LogOut,
    Menu
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSecurity } from '@/context/SecurityContext';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useSecurity();

    const navItems = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Content Scanner', href: '/scanner', icon: FileSearch },
        { name: 'Security Monitor', href: '/security', icon: ShieldCheck },
        { name: 'Alerts Center', href: '/alerts', icon: Bell },
        { name: 'Policies', href: '/policies', icon: ScrollText },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Threats', href: '/threats', icon: ShieldAlert },
        { name: 'My Profile', href: '/profile', icon: User },
    ];

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <aside
            className="fixed left-0 top-0 z-40 h-screen w-80 bg-neutral-900 border-r border-white/5 hidden md:block"
            style={{
                background: 'linear-gradient(180deg, #020617 0%, #000000 100%)',
                borderColor: 'rgba(51, 65, 85, 0.3)'
            }}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-8 border-b border-white/5">
                    <div className="flex flex-col">
                        <span className="text-4xl font-black text-white tracking-tight">
                            DATAGUARD
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-8">
                    <ul className="space-y-2 px-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center px-6 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                            ? 'bg-indigo-600/15 text-indigo-400 shadow-lg shadow-indigo-500/10'
                                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <item.icon
                                            size={24}
                                            className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-400 group-hover:text-white'}`}
                                        />
                                        <span className="ml-4 text-lg font-black whitespace-nowrap tracking-tight">
                                            {item.name}
                                        </span>
                                        {isActive && (
                                            <div className="ml-auto w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-8 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-6 py-4 text-neutral-400 rounded-2xl hover:text-red-400 hover:bg-red-500/10 group transition-all"
                    >
                        <LogOut size={24} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
                        <span className="ml-4 text-lg font-black whitespace-nowrap tracking-tight">
                            Logout
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
