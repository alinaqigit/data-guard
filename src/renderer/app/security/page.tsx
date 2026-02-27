'use client';

import { useState, useEffect, useRef } from 'react';
import {
    AlertTriangle,
    Activity,
    CheckCircle,
    Eye,
    Settings,
    Server,
    Globe,
    Cpu,
    BarChart3,
    Users,
} from 'lucide-react';

import { useSecurity } from '@/context/SecurityContext';
import Toast from '@/components/Toast';

// Smoothly animate a number value toward a target
function useSmoothedValue(target: number, duration = 800, paused = false): number {
    const [display, setDisplay] = useState(target);
    const animRef = useRef<number | null>(null);
    const startRef = useRef({ from: target, to: target, startTime: 0 });

    useEffect(() => {
        if (paused) return;
        const from = display;
        startRef.current = { from, to: target, startTime: performance.now() };

        if (animRef.current) cancelAnimationFrame(animRef.current);

        const animate = (now: number) => {
            const elapsed = now - startRef.current.startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startRef.current.from + (startRef.current.to - startRef.current.from) * eased;
            setDisplay(Math.round(current));
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [target]);

    return display;
}

function MetricBar({ value, color, glowColor }: { value: number; color: string; glowColor: string }) {
    return (
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
                className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${value}%`, boxShadow: `0 0 15px ${glowColor}` }}
            />
        </div>
    );
}

export default function SecurityMonitorPage() {
    const { alerts, systemMetrics, monitoringSettings, updateMonitoringSettings } = useSecurity();

    const [isSaving, setIsSaving] = useState(false);
    const [saveText, setSaveText] = useState('Save Configuration');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    // Local copies of settings so changes are only applied on Save
    const [localSettings, setLocalSettings] = useState(monitoringSettings);
    const prevAlertsLengthRef = useRef(alerts.length);

    // Keep local settings in sync when context settings change externally
    useEffect(() => {
        setLocalSettings(monitoringSettings);
    }, [monitoringSettings]);

    // ── Show toast when a new alert arrives ──────────────────────────────────
    useEffect(() => {
        if (alerts.length > prevAlertsLengthRef.current) {
            const newest = alerts[0];
            if (newest) {
                const isEncryption = newest.source === 'Auto-Response';
                setToast({
                    message: isEncryption
                        ? `Auto-encrypted: ${newest.description}`
                        : `⚠️ Threat detected: ${newest.description}`,
                    type: isEncryption ? 'success' : 'error',
                });
            }
        }
        prevAlertsLengthRef.current = alerts.length;
    }, [alerts]);

    const isRealTimePaused = !monitoringSettings.realTime;
    const smoothCpu = useSmoothedValue(systemMetrics.cpu, 800, isRealTimePaused);
    const smoothMemory = useSmoothedValue(systemMetrics.memory, 800, isRealTimePaused);
    const smoothNetwork = useSmoothedValue(systemMetrics.network, 800, isRealTimePaused);
    const smoothSessions = useSmoothedValue(systemMetrics.activeSessions, 800, isRealTimePaused);

    const criticalCount = alerts.filter(a => a.severity === 'High' && (a.status === 'New' || a.status === 'Investigating')).length;
    const warningCount = alerts.filter(a => a.severity === 'Medium' && (a.status === 'New' || a.status === 'Investigating')).length;
    const activeSessions = smoothSessions;

    const recentActivity = alerts.length > 0
        ? alerts.slice(0, 5).map(a => ({
            id: a.id,
            time: a.time.split(' ')[1] || a.time,
            event: a.type,
            source: a.source,
            type: a.severity === 'High' ? 'critical' : a.severity === 'Medium' ? 'warning' : 'info'
        }))
        : [{ id: 1, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: 'No recent critical events', source: 'System', type: 'success' }];

    // ── Save applies all local setting changes at once ────────────────────────
    const handleSave = async () => {
        setIsSaving(true);
        setSaveText('Saving...');
        try {
            await updateMonitoringSettings(localSettings);
            setSaveText('Configuration Saved!');
            setToast({ message: 'Configuration saved successfully.', type: 'success' });
        } catch {
            setToast({ message: 'Failed to save configuration.', type: 'error' });
            setSaveText('Save Configuration');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveText('Save Configuration'), 2000);
        }
    };

    const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
        <div
            className={`w-12 h-6 rounded-full flex items-center px-1.5 transition-colors duration-300 cursor-pointer ${value ? 'bg-indigo-600' : 'bg-white/10'}`}
            onClick={onChange}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    );

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
                <div className="lg:col-span-2 space-y-6">

                    {/* Live Monitoring Dashboard */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #020617 0%, #000000 100%)', borderColor: 'rgba(51, 65, 85, 0.3)' }}>
                        <div className="flex items-center gap-3 mb-8">
                            <Activity className="text-blue-500" size={28} />
                            <h2 className="text-xl font-black text-white tracking-tight">Live Monitoring Dashboard</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-red-400 text-base font-black uppercase tracking-widest mb-2">Critical Alerts</p>
                                <span className="text-4xl font-black text-white">{criticalCount}</span>
                                <p className="text-red-400/60 text-xs mt-2 font-bold">High severity · Active</p>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-yellow-400 text-base font-black uppercase tracking-widest mb-2">Warnings</p>
                                <span className="text-4xl font-black text-white">{warningCount}</span>
                                <p className="text-yellow-400/60 text-xs mt-2 font-bold">Medium severity · Active</p>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center shadow-xl">
                                <p className="text-blue-400 text-base font-black uppercase tracking-widest mb-2">Active Sessions</p>
                                <span className="text-4xl font-black text-white">{activeSessions}</span>
                                <p className="text-blue-400/60 text-xs mt-2 font-bold">Connected clients</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Stream */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #020617 0%, #000000 100%)', borderColor: 'rgba(51, 65, 85, 0.3)' }}>
                        <h3 className="text-xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                            <Activity className="text-indigo-500" size={28} />
                            Recent Activity Stream
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
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
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #020617 0%, #000000 100%)', borderColor: 'rgba(51, 65, 85, 0.3)' }}>
                        <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 tracking-tight">
                            <Settings size={28} className="text-indigo-400" />
                            Monitoring Controls
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-6">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div>
                                        <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Real-time Monitoring</span>
                                        <p className="text-xs text-neutral-500 mt-0.5">Stream live alerts and events</p>
                                    </div>
                                    <Toggle
                                        value={localSettings.realTime}
                                        onChange={() => setLocalSettings(prev => ({ ...prev, realTime: !prev.realTime }))}
                                    />
                                </label>

                                <hr className="border-white/5" />

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div>
                                        <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Auto-response</span>
                                        <p className="text-xs text-neutral-500 mt-0.5">Auto-encrypt files on threat detection</p>
                                    </div>
                                    <Toggle
                                        value={localSettings.autoResponse}
                                        onChange={() => setLocalSettings(prev => ({ ...prev, autoResponse: !prev.autoResponse }))}
                                    />
                                </label>

                                <hr className="border-white/5" />

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div>
                                        <span className="text-base font-bold text-neutral-300 group-hover:text-white transition-colors">Push Notifications</span>
                                        <p className="text-xs text-neutral-500 mt-0.5">Alert on new threats detected</p>
                                    </div>
                                    <Toggle
                                        value={localSettings.notifications}
                                        onChange={() => setLocalSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                                    />
                                </label>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`w-full ${isSaving ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-4 rounded-xl font-black transition-all shadow-xl shadow-indigo-900/20 active:scale-95 text-lg flex justify-center items-center gap-3`}
                                >
                                    {isSaving && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {saveText}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div className="border rounded-2xl p-4 md:p-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #020617 0%, #000000 100%)', borderColor: 'rgba(51, 65, 85, 0.3)' }}>
                        <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                            <BarChart3 size={28} className="text-emerald-400" />
                            System Metrics
                        </h3>
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Cpu size={18} /> CPU Usage</span>
                                    <span className="text-blue-400 font-black">{smoothCpu}%</span>
                                </div>
                                <MetricBar value={smoothCpu} color="bg-blue-500" glowColor="rgba(59,130,246,0.5)" />
                            </div>
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Server size={18} /> Memory Usage</span>
                                    <span className={`font-black ${smoothMemory > 85 ? 'text-red-400' : smoothMemory > 70 ? 'text-yellow-400' : 'text-emerald-400'}`}>{smoothMemory}%</span>
                                </div>
                                <MetricBar
                                    value={smoothMemory}
                                    color={smoothMemory > 85 ? 'bg-red-500' : smoothMemory > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}
                                    glowColor={smoothMemory > 85 ? 'rgba(239,68,68,0.5)' : smoothMemory > 70 ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.5)'}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-base font-bold mb-3">
                                    <span className="text-neutral-400 flex items-center gap-2"><Globe size={18} /> Network Traffic</span>
                                    <span className="text-green-400 font-black">{smoothNetwork}%</span>
                                </div>
                                <MetricBar value={smoothNetwork} color="bg-green-500" glowColor="rgba(34,197,94,0.5)" />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-xs font-bold" style={{color: isRealTimePaused ? '#eab308' : '#6b7280'}}>
                            <span className="relative flex h-2 w-2">
                                <span className={"animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 " + (isRealTimePaused ? "bg-yellow-400" : "bg-emerald-400")}></span>
                                <span className={"relative inline-flex rounded-full h-2 w-2 " + (isRealTimePaused ? "bg-yellow-500" : "bg-emerald-500")}></span>
                            </span>
                            {isRealTimePaused ? 'Paused · Real-time monitoring is off' : 'Live · Updates every 3 seconds'}
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}