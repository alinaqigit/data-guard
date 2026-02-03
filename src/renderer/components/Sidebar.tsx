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
    const [isCollapsed, setIsCollapsed] = useState(false);
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
            className={`fixed left-0 top-0 z-40 h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'
                } hidden md:block`}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <div className={`flex flex-col ${isCollapsed ? 'hidden' : 'flex'}`}>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600 dark:from-indigo-500 dark:to-emerald-500">
                            DLP Security
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                            Data Loss Prevention
                        </span>
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-600/10 dark:text-indigo-400'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                            }`}
                                    >
                                        <item.icon
                                            size={20}
                                            className={`flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white'}`}
                                        />
                                        {!isCollapsed && (
                                            <span className="ml-3 text-sm font-medium whitespace-nowrap">
                                                {item.name}
                                            </span>
                                        )}
                                        {isActive && !isCollapsed && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-3 text-neutral-500 dark:text-neutral-400 rounded-xl hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 group transition-colors"
                    >
                        <LogOut size={20} className="flex-shrink-0 group-hover:text-red-500 dark:group-hover:text-red-400" />
                        {!isCollapsed && (
                            <span className="ml-3 text-sm font-medium whitespace-nowrap">
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}
