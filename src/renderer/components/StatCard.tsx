import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: string;
    bgColor?: string;
    onClick?: () => void;
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    change,
    trend,
    color = 'text-blue-400',
    bgColor = 'bg-blue-500/10',
    onClick
}: StatCardProps) {
    return (
        <div
            className={`group p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
            style={{
                background: 'var(--background-card)',
                borderColor: 'var(--border)',
                boxShadow: '0 1px 3px var(--shadow-light)',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-main)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
            }}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${bgColor} ${color}`}>
                    <Icon size={22} />
                </div>
                {change && (
                    <div
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{
                            fontWeight: 500,
                            color: trend === 'up' ? 'var(--success-alt)' : trend === 'down' ? 'var(--danger)' : 'var(--text-tertiary)',
                            background: trend === 'up' ? 'var(--success-a10)' : trend === 'down' ? 'var(--danger-a10)' : 'var(--neutral-a10)',
                        }}
                    >
                        {trend === 'up' && <ArrowUpRight size={13} />}
                        {trend === 'down' && <ArrowDownRight size={13} />}
                        {change}
                    </div>
                )}
            </div>
            <div>
                <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
                >
                    {title}
                </p>
                <h3
                    className="text-2xl tracking-tight"
                    style={{ color: 'var(--text-primary)', fontWeight: 700 }}
                >
                    {value}
                </h3>
            </div>
        </div>
    );
}