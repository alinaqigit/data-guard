'use client';

import { useState } from 'react';
import {
    Shield,
    AlertTriangle,
    Activity,
    CheckCircle,
    Zap,
    Lock,
    Eye,
    Settings,
    Bell,
    Server,
    Globe,
    Cpu
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useSecurity } from '@/context/SecurityContext';

export default function SecurityMonitorPage() {
    const { alerts, totalFilesScanned } = useSecurity();
    const router = useRouter();

    // Derive stats from global alerts state
    const criticalCount = alerts.filter(a => a.severity === 'High' && a.status === 'New').length;
    const warningCount = alerts.filter(a => a.severity === 'Medium' && a.status === 'New').length;
    const resolvedCount = alerts.filter(a => a.status === 'Resolved').length;
    const policyViolations = alerts.filter(a => a.type.toLowerCase().includes('policy')).length;

    const [isSaving, setIsSaving] = useState(false);
    const [saveText, setSaveText] = useState('Save Configuration');
    const [sensitivity, setSensitivity] = useState('Medium');
    const [toggles, setToggles] = useState({
        realTime: true,
        autoResponse: false,
        notifications: true
    });

    // Recent activity derived from alerts for consistency
    const recentActivity = alerts.length > 0
        ? alerts.slice(0, 5).map(a => ({
            id: a.id,
            time: a.time.split(' ')[1] || a.time,
            event: a.type,
            source: a.source,
            type: a.severity === 'High' ? 'critical' : a.severity === 'Medium' ? 'warning' : 'info'
        }))
        : [
            { id: 1, time: '10:42 AM', event: 'No recent critical events', source: 'System', type: 'success' }
        ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                    Security Monitor
                </h1>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    System Online
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left/Main Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Live Monitoring Dashboard */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="text-blue-500" size={24} />
                            <h2 className="text-xl font-bold text-white">Live Monitoring Dashboard</h2>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                <p className="text-red-400 text-sm font-medium mb-1">Critical Alerts</p>
                                <span className="text-4xl font-bold text-white">{criticalCount}</span>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                                <p className="text-yellow-400 text-sm font-medium mb-1">Warnings</p>
                                <span className="text-4xl font-bold text-white">{warningCount}</span>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                                <p className="text-blue-400 text-sm font-medium mb-1">Active Sessions</p>
                                <span className="text-4xl font-bold text-white">48</span>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                                <p className="text-green-400 text-sm font-medium mb-1">System Health</p>
                                <span className="text-4xl font-bold text-white">99%</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Stream */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Activity Stream</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-800">
                                    <div className={`mt-1 p-1.5 rounded-full 
                                        ${activity.type === 'critical' ? 'bg-red-500/20 text-red-500' :
                                            activity.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                                                activity.type === 'success' ? 'bg-green-500/20 text-green-500' :
                                                    'bg-blue-500/20 text-blue-500'}`}>
                                        {activity.type === 'critical' ? <AlertTriangle size={14} /> :
                                            activity.type === 'warning' ? <Eye size={14} /> :
                                                activity.type === 'success' ? <CheckCircle size={14} /> :
                                                    <Activity size={14} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-white font-medium text-sm">{activity.event}</p>
                                            <span className="text-xs text-neutral-500">{activity.time}</span>
                                        </div>
                                        <p className="text-neutral-400 text-xs mt-0.5">{activity.source}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-6">System Metrics</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-400 flex items-center gap-2"><Cpu size={14} /> CPU Usage</span>
                                    <span className="text-blue-400 font-bold">45%</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[45%] rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-400 flex items-center gap-2"><Server size={14} /> Memory Usage</span>
                                    <span className="text-yellow-400 font-bold">72%</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 w-[72%] rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-400 flex items-center gap-2"><Globe size={14} /> Network Traffic</span>
                                    <span className="text-green-400 font-bold">28%</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[28%] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">

                    {/* Alert Summary */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Alert Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                                <span className="text-neutral-300 text-sm">Critical Alerts</span>
                                <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs font-bold">{criticalCount}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                                <span className="text-neutral-300 text-sm">Policy Violations</span>
                                <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs font-bold">{policyViolations}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                                <span className="text-neutral-300 text-sm">Security Events</span>
                                <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-xs font-bold">{alerts.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-neutral-800/50 rounded-lg">
                                <span className="text-neutral-300 text-sm">Resolved</span>
                                <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-xs font-bold">{resolvedCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Monitoring Controls */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Settings size={18} className="text-neutral-400" />
                            Monitoring Controls
                        </h3>

                        <div className="space-y-6">
                            {/* Sensitivity Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-neutral-400">
                                    <span>Sensitivity</span>
                                    <span className="text-white font-medium">{sensitivity}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="1"
                                    className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setSensitivity(val === 1 ? 'Low' : val === 2 ? 'Medium' : 'High');
                                    }}
                                    defaultValue="2"
                                />
                                <div className="flex justify-between text-[10px] text-neutral-600 uppercase font-bold tracking-wider">
                                    <span>Low</span>
                                    <span>Medium</span>
                                    <span>High</span>
                                </div>
                            </div>

                            <hr className="border-neutral-800" />

                            {/* Toggles */}
                            <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Real-time Monitoring</span>
                                    <div
                                        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${toggles.realTime ? 'bg-blue-600' : 'bg-neutral-700'}`}
                                        onClick={() => setToggles({ ...toggles, realTime: !toggles.realTime })}
                                    >
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${toggles.realTime ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Auto-response</span>
                                    <div
                                        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${toggles.autoResponse ? 'bg-blue-600' : 'bg-neutral-700'}`}
                                        onClick={() => setToggles({ ...toggles, autoResponse: !toggles.autoResponse })}
                                    >
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${toggles.autoResponse ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Email Notifications</span>
                                    <div
                                        className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${toggles.notifications ? 'bg-blue-600' : 'bg-neutral-700'}`}
                                        onClick={() => setToggles({ ...toggles, notifications: !toggles.notifications })}
                                    >
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${toggles.notifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-2 space-y-3">
                                <button
                                    onClick={() => {
                                        setIsSaving(true);
                                        setSaveText('Saving...');
                                        setTimeout(() => {
                                            setIsSaving(false);
                                            setSaveText('Configuration Saved!');
                                            setTimeout(() => setSaveText('Save Configuration'), 2000);
                                        }, 1500);
                                    }}
                                    disabled={isSaving}
                                    className={`w-full ${isSaving ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95 text-sm flex justify-center items-center gap-2`}
                                >
                                    {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {saveText}
                                </button>
                                <button
                                    onClick={() => router.push('/alerts')}
                                    className="w-full bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 py-2.5 rounded-lg font-medium transition-all active:scale-95 text-sm"
                                >
                                    View All Alerts
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
