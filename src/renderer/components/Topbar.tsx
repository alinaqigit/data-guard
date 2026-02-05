'use client';

import { Menu } from 'lucide-react';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
    return (
        <header className="sticky top-0 z-30 w-full h-16 backdrop-blur-md border-b transition-colors duration-300 md:hidden"
            style={{
                background: 'rgba(2, 6, 23, 0.8)',
                borderColor: 'rgba(51, 65, 85, 0.3)'
            }}
        >
            <div className="flex items-center h-full px-4">
                {/* Mobile Menu Trigger */}
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    aria-label="Open Menu"
                >
                    <Menu size={24} />
                </button>
            </div>
        </header>
    );
}
