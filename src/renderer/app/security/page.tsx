'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Activity, CheckCircle, Eye, Settings, Server, Globe, Cpu, BarChart3 } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';
import Toast from '@/components/Toast';

function useSmoothedValue(target: number, duration = 800, paused = false): number {
    const [display, setDisplay] = useState(target);
    const displayRef = useRef(target);
    const animRef = useRef<number | null>(null);

    useEffect(() => {
        if (paused) {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            return;
        }
        const from = displayRef.current;
        const startTime = performance.now();
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + (target - from) * eased);
            displayRef.current = current;
            setDisplay(current);
            if (progress < 1) animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [target, paused, duration]);
    return display;
}

function MetricBar({ value, color }: { value: number; color: string }) {
    return (
        <div style={{ height: '6px', background: 'var(--surface-1)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '99px', transition: 'width 0.7s ease' }} />
        </div>
    );
}

export default function SecurityMonitorPage() {
    const { alerts, systemMetrics, monitoringSettings, updateMonitoringSettings } = useSecurity();
    const [isSaving, setIsSaving] = useState(false);
    const [saveText, setSaveText] = useState('Save Configuration');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [localSettings, setLocalSettings] = useState(monitoringSettings);
    const prevAlertsLengthRef = useRef(alerts.length);

    useEffect(() => { setLocalSettings(monitoringSettings); }, [monitoringSettings]);

    useEffect(() => {
        if (alerts.length > prevAlertsLengthRef.current) {
            const newest = alerts[0];
            if (newest) {
                const isEncryption = newest.source === 'Auto-Response';
                setToast({ message: isEncryption ? `Auto-encrypted: ${newest.description}` : `⚠ Threat detected: ${newest.description}`, type: isEncryption ? 'success' : 'warning' });
            }
        }
        prevAlertsLengthRef.current = alerts.length;
    }, [alerts]);

    const paused = !monitoringSettings.realTime;
    const smoothCpu     = useSmoothedValue(systemMetrics.cpu, 800, paused);
    const smoothMemory  = useSmoothedValue(systemMetrics.memory, 800, paused);
    const smoothNetwork = useSmoothedValue(systemMetrics.network, 800, paused);
    const smoothSessions = useSmoothedValue(systemMetrics.activeSessions, 800, paused);

    const criticalCount = alerts.filter(a => a.severity === 'High' && (a.status === 'New' || a.status === 'Investigating')).length;
    const warningCount  = alerts.filter(a => a.severity === 'Medium' && (a.status === 'New' || a.status === 'Investigating')).length;

    const recentActivity = alerts.length > 0
        ? alerts.slice(0, 5).map(a => ({ id: a.id, time: a.time.split(' ')[1] || a.time, event: a.type, source: a.source, type: a.severity === 'High' ? 'critical' : a.severity === 'Medium' ? 'warning' : 'info' }))
        : [{ id: 1, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: 'No recent critical events', source: 'System', type: 'success' }];

    const handleSave = async () => {
        setIsSaving(true);
        setSaveText('Saving...');
        try {
            await updateMonitoringSettings(localSettings);
            setSaveText('Saved!');
            setToast({ message: 'Configuration saved.', type: 'success' });
        } catch {
            setToast({ message: 'Failed to save.', type: 'error' });
            setSaveText('Save Configuration');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveText('Save Configuration'), 2000);
        }
    };

    const cardStyle = { background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' };

    const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
        <div onClick={onChange} style={{
            width: '44px', height: '24px', borderRadius: '99px', display: 'flex', alignItems: 'center',
            padding: '0 4px', cursor: 'pointer', transition: 'background 0.3s',
            background: value ? 'var(--brand-light)' : 'var(--surface-1)', border: `1px solid ${value ? 'var(--brand-main)' : 'var(--border)'}`,        
        }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--text-primary)', transition: 'transform 0.3s', transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
        </div>
    );

    const memColor = smoothMemory > 85 ? 'var(--danger)' : smoothMemory > 70 ? 'var(--warning)' : 'var(--success-alt)';

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Security Monitor</h1>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success-alt)' }}>
                    <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
                        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-alt)', opacity: 0.4, animation: 'ping 1.5s infinite' }} />
                        <span style={{ position: 'relative', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success-alt)' }} />
                    </span>
                    System Online
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">

                    {/* Dashboard metrics */}
                    <div style={cardStyle}>
                        <div className="flex items-center gap-3 mb-6">
                            <Activity size={18} style={{ color: 'var(--brand-light)' }} />
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Monitoring Dashboard</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Critical Alerts', value: criticalCount, color: 'var(--danger)', bg: 'var(--danger-a08)', border: 'var(--danger-a20)', subColor: 'var(--danger-a50)', sub: 'High severity · Active' },
                                { label: 'Warnings',        value: warningCount,  color: 'var(--warning)', bg: 'var(--warning-a08)', border: 'var(--warning-a20)', subColor: 'var(--warning-a50)', sub: 'Medium severity · Active' },
                                { label: 'Active Sessions', value: smoothSessions, color: 'var(--brand-light)', bg: 'var(--brand-a08)', border: 'var(--brand-a20)', subColor: 'var(--brand-a50)', sub: 'Connected clients' },
                            ].map(({ label, value, color, bg, border, subColor, sub }) => (
                                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
                                    <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                                    <p style={{ fontSize: '11px', color: subColor, marginTop: '6px' }}>{sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity stream */}
                    <div style={cardStyle}>
                        <div className="flex items-center gap-3 mb-5">
                            <Activity size={18} style={{ color: 'var(--brand-light)' }} />
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Activity Stream</span>
                        </div>
                        <div className="space-y-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                            {recentActivity.map((a) => {
                                const iconColor = a.type === 'critical' ? 'var(--danger)' : a.type === 'warning' ? 'var(--warning)' : a.type === 'success' ? 'var(--success-alt)' : 'var(--brand-light)';
                                const iconBg    = a.type === 'critical' ? 'var(--danger-a10)' : a.type === 'warning' ? 'var(--warning-a10)' : a.type === 'success' ? 'var(--success-a10)' : 'var(--brand-a10)';
                                const Icon      = a.type === 'critical' ? AlertTriangle : a.type === 'warning' ? Eye : a.type === 'success' ? CheckCircle : Activity;
                                return (
                                    <div key={a.id} className="flex items-start gap-4 rounded-xl transition-colors"
                                        style={{ padding: '12px', cursor: 'default' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--background-subtle)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ padding: '8px', background: iconBg, borderRadius: '8px', flexShrink: 0, marginTop: '2px' }}>
                                            <Icon size={14} style={{ color: iconColor }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="flex justify-between items-start gap-2">
                                                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{a.event}</p>
                                                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-disabled)', flexShrink: 0 }}>{a.time}</span>
                                            </div>
                                            <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>{a.source}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Controls */}
                    <div style={cardStyle}>
                        <div className="flex items-center gap-3 mb-6">
                            <Settings size={18} style={{ color: 'var(--brand-light)' }} />
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Monitoring Controls</span>
                        </div>
                        <div className="space-y-5">
                            {[
                                { key: 'realTime',      label: 'Real-time Monitoring', desc: 'Stream live alerts and events' },
                                { key: 'autoResponse',  label: 'Auto-response',        desc: 'Auto-encrypt files on threat detection' },
                                { key: 'notifications', label: 'Push Notifications',   desc: 'Alert on new threats detected' },
                            ].map(({ key, label, desc }, i) => (
                                <div key={key}>
                                    {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--surface-1)', marginBottom: '20px' }} />}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '2px' }}>{desc}</p>
                                        </div>
                                        <Toggle
                                            value={(localSettings as any)[key]}
                                            onChange={() => setLocalSettings(prev => ({ ...prev, [key]: !(prev as any)[key] }))}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleSave} disabled={isSaving}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all mt-2"
                                style={{ background: isSaving ? 'var(--success)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '14px', fontWeight: 600, opacity: isSaving ? 0.8 : 1 }}
                                onMouseEnter={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'; }}
                                onMouseLeave={e => { if (!isSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'; }}
                            >
                                {isSaving && <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-on-brand)' }} />}
                                {saveText}
                            </button>
                        </div>
                    </div>

                    {/* System Metrics */}
                    <div style={cardStyle}>
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart3 size={18} style={{ color: 'var(--success-alt)' }} />
                            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>System Metrics</span>
                        </div>
                        <div className="space-y-5">
                            {[
                                { label: 'CPU Usage',        icon: Cpu,    value: smoothCpu,     color: 'var(--brand-light)' },
                                { label: 'Memory Usage',     icon: Server, value: smoothMemory,  color: memColor  },
                                { label: 'Network Traffic',  icon: Globe,  value: smoothNetwork, color: 'var(--success-alt)' },
                            ].map(({ label, icon: Icon, value, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="flex items-center gap-1.5" style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                                            <Icon size={14} style={{ color: 'var(--text-disabled)' }} /> {label}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'monospace' }}>{value}%</span>
                                    </div>
                                    <MetricBar value={value} color={color} />
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-5" style={{ fontSize: '12px', fontWeight: 400, color: paused ? 'var(--warning)' : 'var(--text-disabled)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: paused ? 'var(--warning)' : 'var(--success-alt)', display: 'inline-block' }} />
                            {paused ? 'Paused · Real-time monitoring is off' : 'Live · Updates every 3 seconds'}
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <style>{`@keyframes ping { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0;transform:scale(2)} }`}</style>
        </div>
    );
}