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
        High:   { bg: 'var(--danger-a10)',   text: 'var(--danger)', border: 'var(--danger-a25)' },
        Medium: { bg: 'var(--warning-a10)',  text: 'var(--warning)', border: 'var(--warning-a25)' },
        Low:    { bg: 'var(--brand-a10)',  text: 'var(--brand-light)', border: 'var(--brand-a25)' },
    };

    const statusColor: Record<string, { bg: string; text: string; border: string }> = {
        Resolved:     { bg: 'var(--success-a10)',   text: 'var(--success-alt)', border: 'var(--success-a25)' },
        Investigating:{ bg: 'var(--brand-a10)',  text: 'var(--brand-light)', border: 'var(--brand-a25)' },
        Quarantined:  { bg: 'var(--warning-a10)',  text: 'var(--warning)', border: 'var(--warning-a25)' },
        New:          { bg: 'var(--neutral-a50)',    text: 'var(--text-tertiary)', border: 'var(--border)' },
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

    const cardStyle = { background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '16px' };
    const thStyle = { color: 'var(--text-disabled)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '12px 20px' };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
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
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <Bell size={20} style={{ color: 'var(--brand-light)' }} />
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Security Alerts</span>
                        {alerts.length > 0 && (
                            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-disabled)' }}>({alerts.length})</span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={alerts.length === 0}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ color: 'var(--danger)', border: '1px solid var(--danger-a30)', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-a08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <Trash2 size={14} /> Delete All
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ background: 'var(--background-subtle)', borderBottom: '1px solid var(--border)' }}>
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
                                        <Bell size={40} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
                                        <p style={{ color: 'var(--text-disabled)', fontWeight: 500, fontSize: '15px' }}>No alerts found</p>
                                        <p style={{ color: 'var(--border)', fontSize: '13px', marginTop: '4px' }}>Everything looks secure for now.</p>
                                    </td>
                                </tr>
                            ) : alerts.map((alert, i) => (
                                <tr key={alert.id}
                                    style={{ borderTop: i > 0 ? '1px solid var(--surface-1)' : undefined }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--background-subtle)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '14px 20px' }}>{badge(severityColor[alert.severity] || severityColor.Low, alert.severity)}</td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 400, whiteSpace: 'nowrap' }}>{alert.time}</td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{alert.type}</td>
                                    <td style={{ padding: '14px 20px', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 400, minWidth: '240px', lineHeight: 1.5 }}>{alert.description}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-disabled)' }}>
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
                                                    style={{ color: 'var(--success-alt)' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--success-a10)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    title="Resolve">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => setDeleteTargetId(alert.id)}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ color: 'var(--text-disabled)' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-a10)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; e.currentTarget.style.background = 'transparent'; }}
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