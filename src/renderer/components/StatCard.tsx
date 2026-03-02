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
                background: '#12161B',
                borderColor: '#30363D',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#445C9A';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#30363D';
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
                            color: trend === 'up' ? '#22C35D' : trend === 'down' ? '#F85149' : '#989898',
                            background: trend === 'up' ? 'rgba(34,195,93,0.1)' : trend === 'down' ? 'rgba(248,81,73,0.1)' : 'rgba(152,152,152,0.1)',
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
                    style={{ color: '#989898', fontWeight: 500 }}
                >
                    {title}
                </p>
                <h3
                    className="text-2xl tracking-tight"
                    style={{ color: '#FFFFFF', fontWeight: 700 }}
                >
                    {value}
                </h3>
            </div>
        </div>
    );
}