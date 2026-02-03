'use client';

import { Bell, User, Moon, Sun, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSecurity } from '@/context/SecurityContext';

export default function Topbar() {
    const { theme, toggleTheme } = useSecurity();
    const [time, setTime] = useState(new Date());

    const isDark = theme === 'dark';

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <header className="sticky top-0 z-30 w-full h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
            <div className="flex items-center justify-between h-full px-4 md:px-6">

                {/* Left: Spacer */}
                <div className="flex-1" />

                {/* Right: Actions */}
                <div className="flex items-center gap-3 md:gap-4">

                    {/* Time Display */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                        <Clock size={14} />
                        <span className="text-xs font-mono font-medium">
                            {time.toLocaleTimeString([], { hour12: false })}
                        </span>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                        aria-label="Toggle Theme"
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Notifications */}
                    <button className="relative p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-neutral-900"></span>
                    </button>

                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

                    {/* User Profile */}
                    <button className="flex items-center gap-3 pl-2 pr-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors group">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-medium text-neutral-700 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Admin User</p>
                            <p className="text-[10px] text-neutral-500">Administrator</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center">
                                <User size={16} className="text-neutral-700 dark:text-white" />
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
