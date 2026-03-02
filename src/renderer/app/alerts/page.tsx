'use client';

import { useState } from 'react';
import { Bell, CheckCircle2, Trash2, Info } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AlertsPage() {
    const { alerts, resolveAlert, clearAllAlerts, deleteAlert } = useSecurity();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    const severityColor: Record<string, { bg: string; text: string; border: string }> = {
        High:   { bg: 'rgba(248,81,73,0.1)',   text: '#F85149', border: 'rgba(248,81,73,0.25)' },
        Medium: { bg: 'rgba(248,193,73,0.1)',  text: '#F8C149', border: 'rgba(248,193,73,0.25)' },
        Low:    { bg: 'rgba(82,114,197,0.1)',  text: '#5272C5', border: 'rgba(82,114,197,0.25)' },
    };

    const statusColor: Record<string, { bg: string; text: string; border: string }> = {
        Resolved:     { bg: 'rgba(34,195,93,0.1)',   text: '#22C35D', border: 'rgba(34,195,93,0.25)' },
        Investigating:{ bg: 'rgba(82,114,197,0.1)',  text: '#5272C5', border: 'rgba(82,114,197,0.25)' },
        Quarantined:  { bg: 'rgba(248,193,73,0.1)',  text: '#F8C149', border: 'rgba(248,193,73,0.25)' },
        New:          { bg: 'rgba(48,54,61,0.5)',    text: '#989898', border: '#30363D' },
    };

    const badge = (colors: { bg: string; text: string; border: string }, label: string) => (
        <span style={{
            background: colors.bg, color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '99px', padding: '2px 10px',
            fontSize: '11px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</span>
    );

    const cardStyle = { background: '#12161B', border: '1px solid #30363D', borderRadius: '16px' };
    const thStyle = { color: '#535865', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '12px 20px' };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Alerts Center
                </h1>
                {alerts.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {badge(severityColor.High,   `${alerts.filter(a => a.severity === 'High'   && a.status !== 'Resolved').length} Critical`)}
                        {badge(severityColor.Medium, `${alerts.filter(a => a.severity === 'Medium' && a.status !== 'Resolved').length} Warnings`)}
                        {badge(statusColor.Resolved, `${alerts.filter(a => a.status === 'Resolved').length} Resolved`)}
                    </div>
                )}
            </div>

            {/* Table card */}
            <div style={cardStyle} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4"
                    style={{ borderBottom: '1px solid #30363D' }}>
                    <div className="flex items-center gap-3">
                        <Bell size={20} style={{ color: '#5272C5' }} />
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>Security Alerts</span>
                        {alerts.length > 0 && (
                            <span style={{ fontSize: '13px', fontWeight: 400, color: '#535865' }}>({alerts.length})</span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={alerts.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ color: '#F85149', border: '1px solid rgba(248,81,73,0.3)', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Trash2 size={14} /> Delete All
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}>
                            <tr>
                                {['Severity','Time','Alert Type','Description','Source','Status','Actions'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '80px 20px', textAlign: 'center' }}>
                                        <Bell size={40} style={{ color: '#30363D', margin: '0 auto 12px' }} />
                                        <p style={{ color: '#535865', fontWeight: 500, fontSize: '15px' }}>No alerts found</p>
                                        <p style={{ color: '#30363D', fontSize: '13px', marginTop: '4px' }}>Everything looks secure for now.</p>
                                    </td>
                                </tr>
                            ) : alerts.map((alert, i) => (
                                <tr key={alert.id}
                                    style={{ borderTop: i > 0 ? '1px solid #1A1F28' : undefined }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#161B22')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '14px 20px' }}>{badge(severityColor[alert.severity] || severityColor.Low, alert.severity)}</td>
                                    <td style={{ padding: '14px 20px', color: '#BABABA', fontSize: '13px', fontWeight: 400, whiteSpace: 'nowrap' }}>{alert.time}</td>
                                    <td style={{ padding: '14px 20px', color: '#FFFFFF', fontSize: '13px', fontWeight: 500 }}>{alert.type}</td>
                                    <td style={{ padding: '14px 20px', color: '#989898', fontSize: '13px', fontWeight: 400, minWidth: '240px', lineHeight: 1.5 }}>{alert.description}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div className="flex items-center gap-1.5" style={{ color: '#535865' }}>
                                            <Info size={13} />
                                            <span style={{ fontSize: '13px', fontWeight: 400 }}>{alert.source}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>{badge(statusColor[alert.status] || statusColor.New, alert.status)}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div className="flex items-center justify-end gap-1">
                                            {alert.status !== 'Resolved' && (
                                                <button onClick={() => resolveAlert(alert.id)}
                                                    className="p-1.5 rounded-lg transition-colors"
                                                    style={{ color: '#22C35D' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,195,93,0.1)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    title="Resolve">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => setDeleteTargetId(alert.id)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ color: '#535865' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = '#535865'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog isOpen={deleteTargetId !== null} title="Delete Alert?"
                message="This alert will be permanently removed." confirmText="Delete"
                cancelText="Cancel" isDestructive onCancel={() => setDeleteTargetId(null)}
                onConfirm={() => { if (deleteTargetId !== null) { deleteAlert(deleteTargetId); setDeleteTargetId(null); } }} />

            <ConfirmDialog isOpen={showClearConfirm} title="Delete All Alerts?"
                message="This will permanently remove all alerts. This action cannot be undone."
                confirmText="Delete All" cancelText="Cancel" isDestructive
                onCancel={() => setShowClearConfirm(false)}
                onConfirm={() => { clearAllAlerts(); setShowClearConfirm(false); }} />
        </div>
    );
}