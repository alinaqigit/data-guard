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
                    <h1 className="text-3xl font-bold text-white mb-2">Threat Intelligence</h1>
                    <p className="text-neutral-400 text-sm">Advanced threat tracking and localized data protection metrics.</p>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">{stat.count.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Threat Records Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" size={24} />
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
                                    <tr key={threat.id} className="group hover:bg-neutral-800/40 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-mono text-neutral-500">THR-{threat.id.toString().slice(-6)}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{threat.type}</span>
                                                <span className="text-neutral-500 text-[10px] uppercase tracking-tighter">{threat.source}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 min-w-[300px]">
                                            <p className="text-neutral-400 text-sm leading-relaxed">{threat.description}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(threat.status)}`}>
                                                {threat.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
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
