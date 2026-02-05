'use client';

import { useState } from 'react';
import {
    Bell,
    ShieldAlert,
    Eye,
    CheckCircle2,
    Trash2,
    AlertTriangle,
    Info,
    MoreVertical
} from 'lucide-react';

import { useSecurity } from '@/context/SecurityContext';

export default function AlertsPage() {
    const { alerts, resolveAlert, clearAllAlerts } = useSecurity();

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'High':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'Medium':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Low':
                return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
            default:
                return 'bg-neutral-800 text-neutral-400';
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Resolved':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'New':
            default:
                return 'bg-neutral-800 text-neutral-400 border-neutral-700/50';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
                        Alerts Center
                    </h1>
                </div>
            </div>

            {/* Security Alerts Card */}
            <div className="border rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    borderColor: 'rgba(51, 65, 85, 0.3)'
                }}>
                <div className="p-4 md:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                        <Bell className="text-blue-500" size={28} />
                        Security Alerts
                    </h2>
                    <button
                        onClick={clearAllAlerts}
                        disabled={alerts.length === 0}
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 border border-red-500/50 hover:border-red-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <Trash2 size={16} />
                        Clear All
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-neutral-400 text-sm font-black uppercase tracking-[0.1em]">
                                <th className="py-4 px-5">Severity</th>
                                <th className="py-4 px-5">Time</th>
                                <th className="py-4 px-5">Alert Type</th>
                                <th className="py-4 px-5">Description</th>
                                <th className="py-4 px-5">Source</th>
                                <th className="py-4 px-5">Status</th>
                                <th className="py-4 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 bg-white/5 rounded-full text-neutral-500">
                                                <Bell size={64} />
                                            </div>
                                            <p className="text-neutral-400 font-black text-2xl">No alerts found</p>
                                            <p className="text-neutral-600 text-lg font-medium">Everything looks secure for now.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                alerts.map((alert) => (
                                    <tr key={alert.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-5">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase border ${getSeverityStyles(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 whitespace-nowrap">
                                            <span className="text-neutral-300 text-base font-bold">{alert.time}</span>
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className="text-white text-base font-black tracking-tight">{alert.type}</span>
                                        </td>
                                        <td className="py-4 px-5 min-w-[300px]">
                                            <p className="text-neutral-400 text-base font-bold leading-relaxed">{alert.description}</p>
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-2 text-neutral-500">
                                                <Info size={16} />
                                                <span className="text-sm font-bold">{alert.source}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className={`px-3 py-1 rounded text-sm font-black uppercase border ${getStatusStyles(alert.status)}`}>
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    title="View Details"
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {alert.status === 'New' && (
                                                    <button
                                                        onClick={() => resolveAlert(alert.id)}
                                                        title="Mark as Resolved"
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                )}
                                                <button className="p-2 text-neutral-600 hover:text-neutral-400 rounded-lg transition-colors sm:hidden">
                                                    <MoreVertical size={18} />
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
