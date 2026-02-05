import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string; // Tailwind text color class for icon
    bgColor?: string; // Tailwind bg color class for icon
    onClick?: () => void; // Optional click handler for navigation
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    change,
    trend,
    color = 'text-indigo-500',
    bgColor = 'bg-indigo-500/10',
    onClick
}: StatCardProps) {
    return (
        <div
            className={`group p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
            style={{
                background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                borderColor: 'rgba(51, 65, 85, 0.3)'
            }}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
                    <Icon size={24} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trend === 'up'
                        ? 'text-emerald-500 bg-emerald-500/10'
                        : trend === 'down'
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800'
                        }`}>
                        {trend === 'up' && <ArrowUpRight size={14} />}
                        {trend === 'down' && <ArrowDownRight size={14} />}
                        {change}
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-neutral-400 font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
            </div>
        </div>
    );
}
