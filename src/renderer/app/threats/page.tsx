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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'New', label: 'New' },
  { value: 'Investigating', label: 'Investigating' },
  { value: 'Quarantined', label: 'Quarantined' },
  { value: 'Resolved', label: 'Resolved' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const STATUS_ORDER: Record<string, number> = { New: 0, Investigating: 1, Quarantined: 2, Resolved: 3 };

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Resolved':      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'Quarantined':   return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Investigating': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default:              return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'High':   return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default:       return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
  }
};

const cardStyle = {
  background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
  borderColor: 'rgba(51, 65, 85, 0.3)',
};

// Next status in the progression cycle
const NEXT_STATUS: Record<string, string> = {
  New: 'Investigating',
  Investigating: 'Quarantined',
  Quarantined: 'Resolved',
  Resolved: 'New',
};

const STATUS_ICON: Record<string, any> = {
  New: AlertTriangle,
  Investigating: Search,
  Quarantined: Box,
  Resolved: ShieldCheck,
};

interface Alert {
  id: number;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
  type: string;
  description: string;
  source: string;
  status: 'New' | 'Resolved' | 'Quarantined' | 'Investigating';
  filePath?: string;
}

export default function ThreatsPage() {
  const { alerts, deleteAlert, deleteAllAlerts, updateAlertStatus, quarantineFile, encryptFile, deleteFile } = useSecurity();

  const [statusFilter, setStatusFilter]     = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedThreat, setSelectedThreat] = useState<Alert | null>(null);
  const [toast, setToast]                   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmState, setConfirmState]     = useState<{ isOpen: boolean; threatId: number | null; mode: 'single' | 'all' }>({ isOpen: false, threatId: null, mode: 'single' });
  const [actionLoading, setActionLoading]   = useState<Record<number, string>>({});

  const totalThreats        = alerts.length;
  const resolvedThreats     = alerts.filter(a => a.status === 'Resolved').length;
  const quarantinedThreats  = alerts.filter(a => a.status === 'Quarantined').length;
  const investigatingThreats = alerts.filter(a => a.status === 'Investigating').length;

  const stats = [
    { label: 'Total Threats',  count: totalThreats,           icon: ShieldAlert, color: 'text-rose-500',    bg: 'bg-rose-500/10' },
    { label: 'Resolved',       count: resolvedThreats,         icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Quarantined',    count: quarantinedThreats,      icon: Box,         color: 'text-blue-500',    bg: 'bg-blue-500/10' },
    { label: 'Investigating',  count: investigatingThreats,    icon: Search,      color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  ];

  const filtered = useMemo(() =>
    alerts
      .filter(a => statusFilter   === 'all' || a.status   === statusFilter)
      .filter(a => severityFilter === 'all' || a.severity === severityFilter)
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)),
    [alerts, statusFilter, severityFilter]
  );

  const setLoading = (id: number, action: string) =>
    setActionLoading(prev => ({ ...prev, [id]: action }));
  const clearLoading = (id: number) =>
    setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handleAdvanceStatus = (threat: Alert) => {
    const next = NEXT_STATUS[threat.status] as Alert['status'];
    updateAlertStatus(threat.id, next);
    if (selectedThreat?.id === threat.id) setSelectedThreat({ ...threat, status: next });
  };

  const handleQuarantine = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({ message: 'No file path available for this threat.', type: 'error' });
      return;
    }
    setLoading(threat.id, 'quarantine');
    try {
      await quarantineFile(threat.id, threat.filePath);
      setToast({ message: 'File quarantined successfully.', type: 'success' });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Quarantine failed.', type: 'error' });
    } finally { clearLoading(threat.id); }
  };

  const handleEncrypt = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({ message: 'No file path available for this threat.', type: 'error' });
      return;
    }
    setLoading(threat.id, 'encrypt');
    try {
      await encryptFile(threat.id, threat.filePath);
      setToast({ message: 'File encrypted and threat resolved.', type: 'success' });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Encryption failed.', type: 'error' });
    } finally { clearLoading(threat.id); }
  };

  const handleDeleteFile = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({ message: 'No file path available for this threat.', type: 'error' });
      return;
    }
    setLoading(threat.id, 'deletefile');
    try {
      await deleteFile(threat.id, threat.filePath);
      setToast({ message: 'File permanently deleted.', type: 'success' });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({ message: err.message || 'Deletion failed.', type: 'error' });
    } finally { clearLoading(threat.id); }
  };

  const handleDeleteRecord = (id: number) => {
    setConfirmState({ isOpen: true, threatId: id, mode: 'single' });
  };

  const handleConfirmDelete = () => {
    if (confirmState.mode === 'all') {
      deleteAllAlerts();
      setToast({ message: 'All threat records deleted.', type: 'success' });
      setSelectedThreat(null);
    } else if (confirmState.threatId) {
      deleteAlert(confirmState.threatId);
      if (selectedThreat?.id === confirmState.threatId) setSelectedThreat(null);
      setToast({ message: 'Threat record deleted.', type: 'success' });
    }
    setConfirmState({ isOpen: false, threatId: null, mode: 'single' });
  };

  const Spinner = () => (
    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  );

  return (
    <div className="space-y-8 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.mode === 'all' ? 'Delete All Threat Records?' : 'Delete Threat Record?'}
        message={confirmState.mode === 'all'
          ? 'All threat records will be permanently deleted. This does not affect files on disk.'
          : 'This threat record will be permanently deleted. This does not affect files on disk.'}
        confirmText={confirmState.mode === 'all' ? 'Delete All' : 'Delete Record'}
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ isOpen: false, threatId: null, mode: 'single' })}
      />

      <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
        Threat Intelligence
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="border rounded-2xl p-4 md:p-5 shadow-xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300" style={cardStyle}>
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={28} /></div>
            <div>
              <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white mt-1 tracking-tight">{stat.count.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout: table + detail panel */}
      <div className={`flex gap-6 transition-all duration-300 ${selectedThreat ? 'items-start' : ''}`}>

        {/* Threat table */}
        <div className={`border rounded-2xl shadow-xl overflow-hidden flex-1 min-w-0 transition-all duration-300 ${selectedThreat ? 'max-w-[calc(100%-340px)]' : 'w-full'}`} style={cardStyle}>
          <div className="p-4 md:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
              <AlertTriangle className="text-rose-500" size={26} />
              Active Threat Registry
              {filtered.length !== alerts.length && (
                <span className="text-sm font-bold text-neutral-500">({filtered.length} of {alerts.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-40">
                <CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              </div>
              <div className="w-40">
                <CustomSelect value={severityFilter} onChange={setSeverityFilter} options={SEVERITY_OPTIONS} />
              </div>
              {alerts.length > 0 && (
                <button
                  onClick={() => setConfirmState({ isOpen: true, threatId: null, mode: 'all' })}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-black text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors border border-rose-500/20 uppercase tracking-wider"
                >
                  <Trash2 size={14} /> Delete All
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/50 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-5 font-semibold">Threat ID</th>
                  <th className="py-4 px-5 font-semibold">Sev.</th>
                  <th className="py-4 px-5 font-semibold">Type / Source</th>
                  <th className="py-4 px-5 font-semibold">Status</th>
                  <th className="py-4 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-neutral-500">
                        <ShieldCheck size={48} className="opacity-20 mb-2" />
                        <p className="text-lg font-bold text-neutral-400">
                          {alerts.length === 0 ? 'Environment Secure' : 'No matches found'}
                        </p>
                        <p className="text-sm">
                          {alerts.length === 0 ? 'No active threats detected.' : 'Adjust your filters.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((threat) => {
                    const NextIcon = STATUS_ICON[NEXT_STATUS[threat.status]] || ChevronRight;
                    const isSelected = selectedThreat?.id === threat.id;
                    const loading = actionLoading[threat.id];
                    return (
                      <tr
                        key={threat.id}
                        className={`group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : 'hover:bg-white/5'}`}
                        onClick={() => setSelectedThreat(isSelected ? null : threat as Alert)}
                      >
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono text-neutral-500 font-bold">
                            THR-{String(threat.id).slice(-6).padStart(6, '0')}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase border ${getSeverityStyles(threat.severity)}`}>
                            {threat.severity}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="text-white font-black text-sm tracking-tight">{threat.type}</p>
                            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider">{threat.source}</p>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${getStatusStyles(threat.status)}`}>
                            {threat.status}
                          </span>
                        </td>
                        <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* View detail */}
                            <button
                              onClick={() => setSelectedThreat(isSelected ? null : threat as Alert)}
                              className="p-2 hover:bg-indigo-500/10 hover:text-indigo-400 text-neutral-500 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {/* Advance status */}
                            <button
                              onClick={() => handleAdvanceStatus(threat as Alert)}
                              className="p-2 hover:bg-amber-500/10 hover:text-amber-400 text-neutral-500 rounded-lg transition-colors"
                              title={`Advance to ${NEXT_STATUS[threat.status]}`}
                            >
                              <NextIcon size={16} />
                            </button>
                            {/* Quarantine */}
                            <button
                              onClick={() => handleQuarantine(threat as Alert)}
                              disabled={!!loading}
                              className="p-2 hover:bg-blue-500/10 hover:text-blue-400 text-neutral-500 rounded-lg transition-colors disabled:opacity-40"
                              title="Quarantine File"
                            >
                              {loading === 'quarantine' ? <Spinner /> : <FolderX size={16} />}
                            </button>
                            {/* Encrypt */}
                            <button
                              onClick={() => handleEncrypt(threat as Alert)}
                              disabled={!!loading}
                              className="p-2 hover:bg-emerald-500/10 hover:text-emerald-400 text-neutral-500 rounded-lg transition-colors disabled:opacity-40"
                              title="Encrypt File (Safe)"
                            >
                              {loading === 'encrypt' ? <Spinner /> : <Lock size={16} />}
                            </button>
                            {/* Delete file */}
                            <button
                              onClick={() => handleDeleteFile(threat as Alert)}
                              disabled={!!loading}
                              className="p-2 hover:bg-red-500/10 hover:text-red-500 text-neutral-500 rounded-lg transition-colors disabled:opacity-40"
                              title="Delete File (Destructive)"
                            >
                              {loading === 'deletefile' ? <Spinner /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selectedThreat && (
          <div className="w-80 flex-shrink-0 border rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-200" style={cardStyle}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-base font-black text-white">Threat Detail</h3>
              <button onClick={() => setSelectedThreat(null)} className="p-1 text-neutral-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* ID + severity */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-neutral-500 font-bold">
                  THR-{String(selectedThreat.id).slice(-6).padStart(6, '0')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase border ${getSeverityStyles(selectedThreat.severity)}`}>
                  {selectedThreat.severity}
                </span>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                  <Activity size={12} /> Type
                </div>
                <p className="text-white font-bold text-sm">{selectedThreat.type}</p>
              </div>

              {/* Source */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                  <FileText size={12} /> Source
                </div>
                <p className="text-neutral-300 text-sm font-bold">{selectedThreat.source}</p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                  <AlertTriangle size={12} /> Description
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed">{selectedThreat.description}</p>
              </div>

              {/* File path */}
              {selectedThreat.filePath && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    <MapPin size={12} /> File Path
                  </div>
                  <p className="text-indigo-400 text-xs font-mono break-all">{selectedThreat.filePath}</p>
                </div>
              )}

              {/* Time */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                  <Clock size={12} /> Detected
                </div>
                <p className="text-neutral-400 text-sm">{selectedThreat.time}</p>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${getStatusStyles(selectedThreat.status)}`}>
                  {selectedThreat.status}
                </span>
              </div>

              <hr className="border-white/5" />

              {/* Action buttons */}
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">File Actions</p>

                <button
                  onClick={() => handleAdvanceStatus(selectedThreat)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl text-sm font-black transition-colors"
                >
                  {(() => { const I = STATUS_ICON[NEXT_STATUS[selectedThreat.status]]; return <I size={16} />; })()}
                  Mark as {NEXT_STATUS[selectedThreat.status]}
                </button>

                {selectedThreat.filePath && (
                  <>
                    <button
                      onClick={() => handleQuarantine(selectedThreat)}
                      disabled={!!actionLoading[selectedThreat.id]}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-black transition-colors disabled:opacity-50"
                    >
                      {actionLoading[selectedThreat.id] === 'quarantine' ? <Spinner /> : <FolderX size={16} />}
                      Quarantine File
                    </button>
                    <button
                      onClick={() => handleEncrypt(selectedThreat)}
                      disabled={!!actionLoading[selectedThreat.id]}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-black transition-colors disabled:opacity-50"
                    >
                      {actionLoading[selectedThreat.id] === 'encrypt' ? <Spinner /> : <Lock size={16} />}
                      Encrypt File
                    </button>
                    <button
                      onClick={() => handleDeleteFile(selectedThreat)}
                      disabled={!!actionLoading[selectedThreat.id]}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-sm font-black transition-colors disabled:opacity-50"
                    >
                      {actionLoading[selectedThreat.id] === 'deletefile' ? <Spinner /> : <Trash2 size={16} />}
                      Delete File
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleDeleteRecord(selectedThreat.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-xl text-sm font-black transition-colors"
                >
                  <X size={16} /> Delete Record Only
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}