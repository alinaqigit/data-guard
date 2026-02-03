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
                    <h1 className="text-3xl font-bold text-white mb-2">Alerts Center</h1>
                    <p className="text-neutral-400 text-sm">Monitor and manage security alerts from all scanner sources.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-red-500" />
                        <span className="text-white font-bold">{alerts.filter(a => a.status === 'New').length} New Alerts</span>
                    </div>
                </div>
            </div>

            {/* Security Alerts Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="text-blue-500" size={24} />
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
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-950/50 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Severity</th>
                                <th className="py-4 px-6 font-semibold">Time</th>
                                <th className="py-4 px-6 font-semibold">Alert Type</th>
                                <th className="py-4 px-6 font-semibold">Description</th>
                                <th className="py-4 px-6 font-semibold">Source</th>
                                <th className="py-4 px-6 font-semibold">Status</th>
                                <th className="py-4 px-6 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-neutral-800 rounded-full text-neutral-500">
                                                <Bell size={32} />
                                            </div>
                                            <p className="text-neutral-400 font-medium">No alerts found</p>
                                            <p className="text-neutral-600 text-sm">Everything looks secure for now.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                alerts.map((alert) => (
                                    <tr key={alert.id} className="group hover:bg-neutral-800/40 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getSeverityStyles(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <span className="text-neutral-300 text-sm font-medium">{alert.time}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-white text-sm font-bold">{alert.type}</span>
                                        </td>
                                        <td className="py-4 px-6 min-w-[300px]">
                                            <p className="text-neutral-400 text-sm leading-relaxed">{alert.description}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1.5 text-neutral-500">
                                                <Info size={14} />
                                                <span className="text-xs">{alert.source}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyles(alert.status)}`}>
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
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
