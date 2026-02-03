import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string; // Tailwind text color class for icon
    bgColor?: string; // Tailwind bg color class for icon
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    change,
    trend,
    color = 'text-indigo-500',
    bgColor = 'bg-indigo-500/10'
}: StatCardProps) {
    return (
        <div className="group p-6 rounded-2xl bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
                    <Icon size={20} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend === 'up'
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{value}</h3>
            </div>
        </div>
    );
}
