'use client';

import { useSecurity } from '@/context/SecurityContext';
import {
    ShieldAlert,
    CheckCircle2,
    Box,
    Search,
    Trash2,
    AlertTriangle,
    Eye,
    ShieldCheck
} from 'lucide-react';

export default function ThreatsPage() {
    const { alerts, deleteAlert } = useSecurity();

    // Stats derivation
    const totalThreats = alerts.length;
    const resolvedThreats = alerts.filter(a => a.status === 'Resolved').length;
    const quarantinedThreats = alerts.filter(a => a.status === 'Quarantined').length;
    const investigatingThreats = alerts.filter(a => a.status === 'Investigating').length;

    const stats = [
        { label: 'Total Threats', count: totalThreats, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'Resolved', count: resolvedThreats, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Quarantined', count: quarantinedThreats, icon: Box, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Investigating', count: investigatingThreats, icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'Quarantined': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Investigating': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">Threat Intelligence</h1>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="border rounded-2xl p-6 shadow-xl flex items-center gap-5 transition-all duration-300 hover:-translate-y-1"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}
                    >
                        <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-base font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-black text-white mt-1 tracking-tight">{stat.count.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Threat Records Section */}
            <div className="border rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}
            >
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                        <AlertTriangle className="text-rose-500" size={28} />
                        Active Threat Registry
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-950/50 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Threat ID</th>
                                <th className="py-4 px-6 font-semibold">Type / Source</th>
                                <th className="py-4 px-6 font-semibold">Description</th>
                                <th className="py-4 px-6 font-semibold">Status</th>
                                <th className="py-4 px-6 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-neutral-500">
                                            <ShieldCheck size={48} className="opacity-20 mb-2" />
                                            <p className="text-lg font-medium text-neutral-400">Environment Secure</p>
                                            <p className="text-sm">No active threats detected in recent scans.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                alerts.map((threat) => (
                                    <tr key={threat.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-5 px-6">
                                            <span className="text-sm font-mono text-neutral-500 font-bold">THR-{threat.id.toString().slice(-6)}</span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-lg tracking-tight">{threat.type}</span>
                                                <span className="text-neutral-500 text-xs font-black uppercase tracking-wider mt-0.5">{threat.source}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 min-w-[300px]">
                                            <p className="text-neutral-400 text-base font-bold leading-relaxed">{threat.description}</p>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border ${getStatusStyles(threat.status)}`}>
                                                {threat.status}
                                            </span>
                                        </td>
                                        破                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-2 text-neutral-400">
                                                <button className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors" title="View Forensics">
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Permanently delete this threat record?')) {
                                                            deleteAlert(threat.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
