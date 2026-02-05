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
    Cpu,
    BarChart3
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
                    Security Monitor
                </h1>
                <div className="flex items-center gap-2 text-base font-bold text-neutral-400">
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
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <div className="flex items-center gap-3 mb-8">
                            <Activity className="text-blue-500" size={28} />
                            <h2 className="text-xl font-black text-white tracking-tight">Live Monitoring Dashboard</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-red-400 text-base font-black uppercase tracking-widest mb-2">Critical Alerts</p>
                                <span className="text-4xl font-black text-white">{criticalCount}</span>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-yellow-400 text-base font-black uppercase tracking-widest mb-2">Warnings</p>
                                <span className="text-4xl font-black text-white">{warningCount}</span>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-blue-400 text-base font-black uppercase tracking-widest mb-2">Active Sessions</p>
                                <span className="text-4xl font-black text-white">48</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Stream */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <h3 className="text-xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                            <Activity className="text-indigo-500" size={28} />
                            Recent Activity Stream
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-5 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                                    <div className={`mt-1 p-2 rounded-full 
                                        ${activity.type === 'critical' ? 'bg-red-500/20 text-red-500' :
                                            activity.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                                                activity.type === 'success' ? 'bg-green-500/20 text-green-500' :
                                                    'bg-blue-500/20 text-blue-500'}`}>
                                        {activity.type === 'critical' ? <AlertTriangle size={18} /> :
                                            activity.type === 'warning' ? <Eye size={18} /> :
                                                activity.type === 'success' ? <CheckCircle size={18} /> :
                                                    <Activity size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-white font-black text-base tracking-tight">{activity.event}</p>
                                            <span className="text-sm font-bold text-neutral-500">{activity.time}</span>
                                        </div>
                                        <p className="text-neutral-400 text-sm font-medium mt-1 uppercase tracking-wider">{activity.source}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column */}
                <div className="space-y-6">

                    {/* Monitoring Controls */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 tracking-tight">
                            <Settings size={28} className="text-indigo-400" />
                            Monitoring Controls
                        </h3>

                        <div className="space-y-6">
                            {/* Sensitivity Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Model Sensitivity</label>
                                <select
                                    className="w-full bg-black/40 border border-white/5 text-white rounded-xl px-4 py-3.5 text-base font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer hover:bg-black/60"
                                    value={sensitivity}
                                    onChange={(e) => setSensitivity(e.target.value)}
                                >
                                    <option value="Low">Low Sensitivity</option>
                                    <option value="Medium">Medium Sensitivity</option>
                                    <option value="High">High Sensitivity</option>
                                </select>
                            </div>

                            <hr className="border-white/5" />

                            {/* Toggles */}
                            <div className="space-y-6">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Real-time Monitoring</span>
                                    <div
                                        className={`w-12 h-6 rounded-full flex items-center px-1.5 transition-colors ${toggles.realTime ? 'bg-indigo-600' : 'bg-white/10'}`}
                                        onClick={() => setToggles({ ...toggles, realTime: !toggles.realTime })}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${toggles.realTime ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Auto-response</span>
                                    <div
                                        className={`w-12 h-6 rounded-full flex items-center px-1.5 transition-colors ${toggles.autoResponse ? 'bg-indigo-600' : 'bg-white/10'}`}
                                        onClick={() => setToggles({ ...toggles, autoResponse: !toggles.autoResponse })}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${toggles.autoResponse ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Email Notifications</span>
                                    <div
                                        className={`w-12 h-6 rounded-full flex items-center px-1.5 transition-colors ${toggles.notifications ? 'bg-indigo-600' : 'bg-white/10'}`}
                                        onClick={() => setToggles({ ...toggles, notifications: !toggles.notifications })}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${toggles.notifications ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-2">
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
                                    className={`w-full ${isSaving ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-4 rounded-xl font-black transition-all shadow-xl shadow-indigo-900/20 active:scale-95 text-lg flex justify-center items-center gap-3`}
                                >
                                    {isSaving && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {saveText}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Metrics (Shifted here to replace Monitoring Controls) */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                            <BarChart3 size={28} className="text-emerald-400" />
                            System Metrics
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Cpu size={18} /> CPU Usage</span>
                                    <span className="text-blue-400 font-black">45%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[45%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Server size={18} /> Memory Usage</span>
                                    <span className="text-yellow-400 font-black">72%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 w-[72%] rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Globe size={18} /> Network Traffic</span>
                                    <span className="text-green-400 font-black">28%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[28%] rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
