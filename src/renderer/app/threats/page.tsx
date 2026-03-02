'use client';

import { useState, useMemo } from 'react';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomSelect from '@/components/CustomSelect';
import { useSecurity } from '@/context/SecurityContext';
import {
  ShieldAlert, Box, Search, Trash2, AlertTriangle,
  Eye, ShieldCheck, Lock, FolderX, ChevronRight,
  X, FileText, Clock, MapPin, Activity,
} from 'lucide-react';

const STATUS_OPTIONS  = [{ value: 'all', label: 'All Statuses' }, { value: 'New', label: 'New' }, { value: 'Investigating', label: 'Investigating' }, { value: 'Quarantined', label: 'Quarantined' }, { value: 'Resolved', label: 'Resolved' }];
const SEVERITY_OPTIONS = [{ value: 'all', label: 'All Severities' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }];
const STATUS_ORDER: Record<string, number> = { New: 0, Investigating: 1, Quarantined: 2, Resolved: 3 };
const NEXT_STATUS: Record<string, string> = { New: 'Investigating', Investigating: 'Quarantined', Quarantined: 'Resolved', Resolved: 'New' };
const STATUS_ICON: Record<string, any> = { New: AlertTriangle, Investigating: Search, Quarantined: Box, Resolved: ShieldCheck };

const severityStyle = (s: string) => s === 'High'
  ? { color: 'var(--danger)', bg: 'var(--danger-a10)',   border: 'var(--danger-a25)' }
  : s === 'Medium'
  ? { color: 'var(--warning)', bg: 'var(--warning-a10)',  border: 'var(--warning-a25)' }
  : { color: 'var(--brand-light)', bg: 'var(--brand-a10)',  border: 'var(--brand-a25)' };

const statusStyle = (s: string) => s === 'Resolved'
  ? { color: 'var(--success-alt)', bg: 'var(--success-a10)',   border: 'var(--success-a25)' }
  : s === 'Quarantined'
  ? { color: 'var(--brand-light)', bg: 'var(--brand-a10)',  border: 'var(--brand-a25)' }
  : s === 'Investigating'
  ? { color: 'var(--warning)', bg: 'var(--warning-a10)',  border: 'var(--warning-a25)' }
  : { color: 'var(--danger)', bg: 'var(--danger-a10)',   border: 'var(--danger-a25)' };

const Badge = ({ label, style }: { label: string; style: { color: string; bg: string; border: string } }) => (
  <span style={{
    background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    borderRadius: '99px', padding: '2px 10px', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  }}>{label}</span>
);

interface Alert {
  id: number; severity: 'High' | 'Medium' | 'Low'; time: string; type: string;
  description: string; source: string; status: 'New' | 'Resolved' | 'Quarantined' | 'Investigating';
  filePath?: string;
}

export default function ThreatsPage() {
  const { alerts, deleteAlert, deleteAllAlerts, updateAlertStatus, quarantineFile, encryptFile, deleteFile } = useSecurity();
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedThreat, setSelectedThreat] = useState<Alert | null>(null);
  const [toast, setToast]                   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmState,   setConfirmState]   = useState<{ isOpen: boolean; threatId: number | null; mode: 'single' | 'all' }>({ isOpen: false, threatId: null, mode: 'single' });
  const [actionLoading,  setActionLoading]  = useState<Record<number, string>>({});

  const stats = [
    { label: 'Total Threats',  count: alerts.length,                                         icon: ShieldAlert, sty: severityStyle('High') },
    { label: 'Resolved',       count: alerts.filter(a => a.status === 'Resolved').length,    icon: ShieldCheck, sty: { color: 'var(--success-alt)', bg: 'var(--success-a10)',  border: 'var(--success-a25)' } },
    { label: 'Quarantined',    count: alerts.filter(a => a.status === 'Quarantined').length, icon: Box,         sty: severityStyle('Low') },
    { label: 'Investigating',  count: alerts.filter(a => a.status === 'Investigating').length,icon: Search,     sty: severityStyle('Medium') },
  ];

  const filtered = useMemo(() =>
    alerts.filter(a => statusFilter === 'all' || a.status === statusFilter)
          .filter(a => severityFilter === 'all' || a.severity === severityFilter)
          .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)),
    [alerts, statusFilter, severityFilter]
  );

  const setLoading = (id: number, action: string) => setActionLoading(prev => ({ ...prev, [id]: action }));
  const clearLoading = (id: number) => setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handleAdvanceStatus = (t: Alert) => {
    const next = NEXT_STATUS[t.status] as Alert['status'];
    updateAlertStatus(t.id, next);
    if (selectedThreat?.id === t.id) setSelectedThreat({ ...t, status: next });
  };

  const handleQuarantine = async (t: Alert) => {
    if (!t.filePath) { setToast({ message: 'No file path available.', type: 'error' }); return; }
    setLoading(t.id, 'quarantine');
    try { await quarantineFile(t.id, t.filePath); setToast({ message: 'File quarantined.', type: 'success' }); if (selectedThreat?.id === t.id) setSelectedThreat(null); }
    catch (err: any) { setToast({ message: err.message || 'Quarantine failed.', type: 'error' }); }
    finally { clearLoading(t.id); }
  };

  const handleEncrypt = async (t: Alert) => {
    if (!t.filePath) { setToast({ message: 'No file path available.', type: 'error' }); return; }
    setLoading(t.id, 'encrypt');
    try { await encryptFile(t.id, t.filePath); setToast({ message: 'File encrypted.', type: 'success' }); if (selectedThreat?.id === t.id) setSelectedThreat(null); }
    catch (err: any) { setToast({ message: err.message || 'Encryption failed.', type: 'error' }); }
    finally { clearLoading(t.id); }
  };

  const handleDeleteFile = async (t: Alert) => {
    if (!t.filePath) { setToast({ message: 'No file path available.', type: 'error' }); return; }
    setLoading(t.id, 'deletefile');
    try { await deleteFile(t.id, t.filePath); setToast({ message: 'File deleted.', type: 'success' }); if (selectedThreat?.id === t.id) setSelectedThreat(null); }
    catch (err: any) { setToast({ message: err.message || 'Deletion failed.', type: 'error' }); }
    finally { clearLoading(t.id); }
  };

  const handleConfirmDelete = () => {
    if (confirmState.mode === 'all') { deleteAllAlerts(); setToast({ message: 'All threat records deleted.', type: 'success' }); setSelectedThreat(null); }
    else if (confirmState.threatId) { deleteAlert(confirmState.threatId); if (selectedThreat?.id === confirmState.threatId) setSelectedThreat(null); setToast({ message: 'Threat record deleted.', type: 'success' }); }
    setConfirmState({ isOpen: false, threatId: null, mode: 'single' });
  };

  const Spinner = () => <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-primary)' }} />;
  const cardStyle = { background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '16px' };
  const thStyle = { padding: '12px 20px', fontSize: '11px', fontWeight: 600 as const, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' };

  const ActionBtn = ({ onClick, title, disabled, color, hoverBg, children }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}
      className="p-1.5 rounded-lg transition-all disabled:opacity-40"
      style={{ color: 'var(--text-disabled)' }}
      onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog isOpen={confirmState.isOpen}
        title={confirmState.mode === 'all' ? 'Delete All Threat Records?' : 'Delete Threat Record?'}
        message={confirmState.mode === 'all' ? 'All threat records will be permanently deleted.' : 'This threat record will be permanently deleted.'}
        confirmText={confirmState.mode === 'all' ? 'Delete All' : 'Delete Record'}
        isDestructive onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ isOpen: false, threatId: null, mode: 'single' })} />

      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Threat Intelligence</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} style={{ ...cardStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', background: stat.sty.bg, borderRadius: '10px' }}>
              <stat.icon size={20} style={{ color: stat.sty.color }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex gap-6 ${selectedThreat ? 'items-start' : ''}`}>
        {/* Table */}
        <div style={{ ...cardStyle, overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Threat Registry</span>
              {filtered.length !== alerts.length && (
                <span style={{ fontSize: '13px', color: 'var(--text-disabled)' }}>({filtered.length} of {alerts.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-36"><CustomSelect value={statusFilter}   onChange={setStatusFilter}   options={STATUS_OPTIONS} /></div>
              <div className="w-36"><CustomSelect value={severityFilter} onChange={setSeverityFilter} options={SEVERITY_OPTIONS} /></div>
              {alerts.length > 0 && (
                <button onClick={() => setConfirmState({ isOpen: true, threatId: null, mode: 'all' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                  style={{ fontSize: '12px', fontWeight: 500, color: 'var(--danger)', border: '1px solid var(--danger-a30)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-a08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                ><Trash2 size={13} /> Delete All</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ background: 'var(--background-subtle)', borderBottom: '1px solid var(--border)' }}>
                <tr>{['Threat ID','Sev.','Type / Source','Status','Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                    <ShieldCheck size={36} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-disabled)', fontWeight: 500 }}>{alerts.length === 0 ? 'Environment Secure' : 'No matches'}</p>
                    <p style={{ color: 'var(--border)', fontSize: '13px', marginTop: '4px' }}>{alerts.length === 0 ? 'No active threats detected.' : 'Adjust your filters.'}</p>
                  </td></tr>
                ) : filtered.map((threat, i) => {
                  const NextIcon = STATUS_ICON[NEXT_STATUS[threat.status]] || ChevronRight;
                  const isSelected = selectedThreat?.id === threat.id;
                  const loading = actionLoading[threat.id];
                  const ssty = severityStyle(threat.severity);
                  const sttsty = statusStyle(threat.status);
                  return (
                    <tr key={threat.id} onClick={() => setSelectedThreat(isSelected ? null : threat as Alert)}
                      style={{
                        borderTop: i > 0 ? '1px solid var(--surface-1)' : undefined,
                        background: isSelected ? 'var(--brand-a06)' : 'transparent',
                        cursor: 'pointer',
                        borderLeft: isSelected ? '2px solid var(--brand-light)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--background-subtle)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-disabled)' }}>
                          THR-{String(threat.id).slice(-6).padStart(6, '0')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}><Badge label={threat.severity} style={ssty} /></td>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{threat.type}</p>
                        <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{threat.source}</p>
                      </td>
                      <td style={{ padding: '14px 20px' }}><Badge label={threat.status} style={sttsty} /></td>
                      <td style={{ padding: '14px 20px' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionBtn onClick={() => setSelectedThreat(isSelected ? null : threat as Alert)} title="View Details" color="var(--brand-light)" hoverBg="var(--brand-a10)"><Eye size={15} /></ActionBtn>
                          <ActionBtn onClick={() => handleAdvanceStatus(threat as Alert)} title={`→ ${NEXT_STATUS[threat.status]}`} color="var(--warning)" hoverBg="var(--warning-a10)"><NextIcon size={15} /></ActionBtn>
                          <ActionBtn onClick={() => handleQuarantine(threat as Alert)} disabled={!!loading} title="Quarantine" color="var(--brand-light)" hoverBg="var(--brand-a10)">{loading === 'quarantine' ? <Spinner /> : <FolderX size={15} />}</ActionBtn>
                          <ActionBtn onClick={() => handleEncrypt(threat as Alert)} disabled={!!loading} title="Encrypt" color="var(--success-alt)" hoverBg="var(--success-a10)">{loading === 'encrypt' ? <Spinner /> : <Lock size={15} />}</ActionBtn>
                          <ActionBtn onClick={() => handleDeleteFile(threat as Alert)} disabled={!!loading} title="Delete File" color="var(--danger)" hoverBg="var(--danger-a10)">{loading === 'deletefile' ? <Spinner /> : <Trash2 size={15} />}</ActionBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selectedThreat && (
          <div style={{ ...cardStyle, width: '300px', flexShrink: 0, overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Threat Detail</span>
              <button onClick={() => setSelectedThreat(null)} style={{ color: 'var(--text-disabled)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}
              ><X size={16} /></button>
            </div>
            <div style={{ padding: '16px' }} className="space-y-4">
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-disabled)' }}>
                  THR-{String(selectedThreat.id).slice(-6).padStart(6, '0')}
                </span>
                <Badge label={selectedThreat.severity} style={severityStyle(selectedThreat.severity)} />
              </div>

              {[
                { icon: Activity, label: 'Type',    value: selectedThreat.type,        valueStyle: { color: 'var(--text-primary)', fontWeight: 500 } },
                { icon: FileText, label: 'Source',  value: selectedThreat.source,      valueStyle: { color: 'var(--text-secondary)' } },
                { icon: AlertTriangle, label: 'Description', value: selectedThreat.description, valueStyle: { color: 'var(--text-tertiary)' } },
                { icon: Clock,    label: 'Detected', value: selectedThreat.time,        valueStyle: { color: 'var(--text-tertiary)' } },
              ].map(({ icon: Icon, label, value, valueStyle }) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <Icon size={11} />{label}
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, ...valueStyle }}>{value}</p>
                </div>
              ))}

              {selectedThreat.filePath && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <MapPin size={11} /> File Path
                  </div>
                  <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-light)', wordBreak: 'break-all', lineHeight: 1.5 }}>{selectedThreat.filePath}</p>
                </div>
              )}

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                <div style={{ marginTop: '6px' }}><Badge label={selectedThreat.status} style={statusStyle(selectedThreat.status)} /></div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--surface-1)' }} />

              <div className="space-y-2">
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</p>
                {[
                  { label: `Mark as ${NEXT_STATUS[selectedThreat.status]}`, action: () => handleAdvanceStatus(selectedThreat), icon: STATUS_ICON[NEXT_STATUS[selectedThreat.status]], color: 'var(--warning)', bg: 'var(--warning-a10)', border: 'var(--warning-a25)', loadKey: null },
                  ...(selectedThreat.filePath ? [
                    { label: 'Quarantine File', action: () => handleQuarantine(selectedThreat), icon: FolderX, color: 'var(--brand-light)', bg: 'var(--brand-a10)', border: 'var(--brand-a25)', loadKey: 'quarantine' },
                    { label: 'Encrypt File',    action: () => handleEncrypt(selectedThreat),    icon: Lock,    color: 'var(--success-alt)', bg: 'var(--success-a10)',  border: 'var(--success-a25)',  loadKey: 'encrypt' },
                    { label: 'Delete File',     action: () => handleDeleteFile(selectedThreat), icon: Trash2,  color: 'var(--danger)', bg: 'var(--danger-a10)',  border: 'var(--danger-a25)',  loadKey: 'deletefile' },
                  ] : []),
                ].map(({ label, action, icon: Icon, color, bg, border, loadKey }) => (
                  <button key={label} onClick={action}
                    disabled={loadKey !== null && !!actionLoading[selectedThreat.id]}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all disabled:opacity-50"
                    style={{ color, background: bg, border: `1px solid ${border}`, fontSize: '13px', fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {loadKey && actionLoading[selectedThreat.id] === loadKey ? <Spinner /> : <Icon size={14} />}
                    {label}
                  </button>
                ))}
                <button onClick={() => setConfirmState({ isOpen: true, threatId: selectedThreat.id, mode: 'single' })}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--background-subtle)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 500 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger-a30)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                ><X size={14} /> Delete Record Only</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}