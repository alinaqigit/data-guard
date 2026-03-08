"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import CustomSelect from "@/components/CustomSelect";
import { useSecurity } from "@/context/SecurityContext";
import { fileActionsService } from "@/lib/api/fileActions.service";
import { ApiThreatDetails } from "@/lib/api/threats.service";
import {
  ShieldAlert,
  Box,
  Search,
  Trash2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Lock,
  Unlock,
  FolderX,
  ChevronRight,
  X,
  FileText,
  Clock,
  MapPin,
  Activity,
  ExternalLink,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import CopyableText from "@/components/CopyableText";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "New", label: "New" },
  { value: "Investigating", label: "Investigating" },
  { value: "Quarantined", label: "Quarantined" },
  { value: "Resolved", label: "Resolved" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const STATUS_ORDER: Record<string, number> = {
  New: 0,
  Investigating: 1,
  Quarantined: 2,
  Resolved: 3,
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Resolved":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Quarantined":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Investigating":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "High":
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    case "Medium":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  }
};

// Next status in the progression cycle
const NEXT_STATUS: Record<string, string> = {
  New: "Investigating",
  Investigating: "Quarantined",
  Quarantined: "Resolved",
  Resolved: "Investigating",
};

// Display labels for the advance-status button
const NEXT_STATUS_LABEL: Record<string, string> = {
  New: "Investigating",
  Investigating: "Quarantined",
  Quarantined: "Resolved",
  Resolved: "Unresolved",
};

const STATUS_ICON: Record<string, any> = {
  New: AlertTriangle,
  Investigating: Search,
  Quarantined: Box,
  Resolved: ShieldCheck,
};

interface EncryptedFile {
  id: number;
  userId: number;
  originalPath: string;
  encryptedPath: string;
  encryptedAt: string;
}

interface Alert {
  id: number;
  severity: "High" | "Medium" | "Low";
  time: string;
  type: string;
  description: string;
  details?: ApiThreatDetails | null;
  source: string;
  status: "New" | "Resolved" | "Quarantined" | "Investigating";
  filePath?: string;
}

export default function ThreatsPage() {
  const {
    alerts,
    deleteAlert,
    deleteAllAlerts,
    updateAlertStatus,
    quarantineFile,
    encryptFile,
    deleteFile,
    refreshThreats,
  } = useSecurity();

  // Fetch persisted threats from the API on page mount
  useEffect(() => {
    refreshThreats();
  }, []);

  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedThreat, setSelectedThreat] = useState<Alert | null>(
    null,
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    threatId: number | null;
    mode: "single" | "all";
  }>({ isOpen: false, threatId: null, mode: "single" });
  const [actionLoading, setActionLoading] = useState<
    Record<number, string>
  >({});

  // ── Encrypted files state ──────────────────────────────
  const [encryptedFiles, setEncryptedFiles] = useState<
    EncryptedFile[]
  >([]);
  const [encLoadingFiles, setEncLoadingFiles] = useState(true);
  const [encActionLoading, setEncActionLoading] = useState<
    Record<number, string>
  >({});
  const [encConfirmState, setEncConfirmState] = useState<{
    isOpen: boolean;
    fileId: number | null;
    encryptedPath: string;
  }>({ isOpen: false, fileId: null, encryptedPath: "" });

  const fetchEncryptedFiles = useCallback(async () => {
    try {
      setEncLoadingFiles(true);
      const { files: encrypted } =
        await fileActionsService.getEncryptedFiles();
      setEncryptedFiles(encrypted);
    } catch {
      // silent — non-critical
    } finally {
      setEncLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchEncryptedFiles();
  }, [fetchEncryptedFiles]);

  const handleDecryptFile = async (file: EncryptedFile) => {
    setEncActionLoading((prev) => ({
      ...prev,
      [file.id]: "decrypt",
    }));
    try {
      const result = await fileActionsService.decrypt(
        file.encryptedPath,
      );
      setToast({
        message: result.message || "File decrypted successfully.",
        type: "success",
      });
      setEncryptedFiles((prev) =>
        prev.filter((f) => f.id !== file.id),
      );
    } catch (err: any) {
      setToast({
        message: err.message || "Decryption failed.",
        type: "error",
      });
    } finally {
      setEncActionLoading((prev) => {
        const n = { ...prev };
        delete n[file.id];
        return n;
      });
    }
  };

  const handleEncShowInFolder = async (encryptedPath: string) => {
    try {
      await fileActionsService.showInFolder(encryptedPath);
    } catch (err: any) {
      setToast({
        message: err.message || "Failed to open folder.",
        type: "error",
      });
    }
  };

  const handleEncConfirm = () => {
    const file = encryptedFiles.find(
      (f) => f.id === encConfirmState.fileId,
    );
    if (!file) return;
    setEncConfirmState({
      isOpen: false,
      fileId: null,
      encryptedPath: "",
    });
    handleDecryptFile(file);
  };

  const getFileName = (p: string) => {
    const parts = p.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1];
  };

  const formatEncDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const totalThreats = alerts.length;
  const resolvedThreats = alerts.filter(
    (a) => a.status === "Resolved",
  ).length;
  const quarantinedThreats = alerts.filter(
    (a) => a.status === "Quarantined",
  ).length;
  const investigatingThreats = alerts.filter(
    (a) => a.status === "Investigating",
  ).length;

  const stats = [
    {
      label: "Total Threats",
      count: totalThreats,
      icon: ShieldAlert,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      label: "Resolved",
      count: resolvedThreats,
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Quarantined",
      count: quarantinedThreats,
      icon: Box,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Investigating",
      count: investigatingThreats,
      icon: Search,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  const filtered = useMemo(
    () =>
      alerts
        .filter(
          (a) => statusFilter === "all" || a.status === statusFilter,
        )
        .filter(
          (a) =>
            severityFilter === "all" || a.severity === severityFilter,
        )
        .sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 99) -
            (STATUS_ORDER[b.status] ?? 99),
        ),
    [alerts, statusFilter, severityFilter],
  );

  const setLoading = (id: number, action: string) =>
    setActionLoading((prev) => ({ ...prev, [id]: action }));
  const clearLoading = (id: number) =>
    setActionLoading((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

  const handleAdvanceStatus = (threat: Alert) => {
    const next = NEXT_STATUS[threat.status] as Alert["status"];
    updateAlertStatus(threat.id, next);
    if (selectedThreat?.id === threat.id)
      setSelectedThreat({ ...threat, status: next });
  };

  const handleQuarantine = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({
        message: "No file path available for this threat.",
        type: "error",
      });
      return;
    }
    setLoading(threat.id, "quarantine");
    try {
      await quarantineFile(threat.id, threat.filePath);
      setToast({
        message: "File quarantined successfully.",
        type: "success",
      });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({
        message: err.message || "Quarantine failed.",
        type: "error",
      });
    } finally {
      clearLoading(threat.id);
    }
  };

  const handleEncrypt = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({
        message: "No file path available for this threat.",
        type: "error",
      });
      return;
    }
    setLoading(threat.id, "encrypt");
    try {
      await encryptFile(threat.id, threat.filePath);
      setToast({
        message: "File encrypted and threat resolved.",
        type: "success",
      });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({
        message: err.message || "Encryption failed.",
        type: "error",
      });
    } finally {
      clearLoading(threat.id);
    }
  };

  const handleDeleteFile = async (threat: Alert) => {
    if (!threat.filePath) {
      setToast({
        message: "No file path available for this threat.",
        type: "error",
      });
      return;
    }
    setLoading(threat.id, "deletefile");
    try {
      await deleteFile(threat.id, threat.filePath);
      setToast({
        message: "File permanently deleted.",
        type: "success",
      });
      if (selectedThreat?.id === threat.id) setSelectedThreat(null);
    } catch (err: any) {
      setToast({
        message: err.message || "Deletion failed.",
        type: "error",
      });
    } finally {
      clearLoading(threat.id);
    }
  };

  const handleDeleteRecord = (id: number) => {
    setConfirmState({ isOpen: true, threatId: id, mode: "single" });
  };

  const handleConfirmDelete = () => {
    if (confirmState.mode === "all") {
      deleteAllAlerts();
      setToast({
        message: "All threat records deleted.",
        type: "success",
      });
      setSelectedThreat(null);
    } else if (confirmState.threatId) {
      deleteAlert(confirmState.threatId);
      if (selectedThreat?.id === confirmState.threatId)
        setSelectedThreat(null);
      setToast({
        message: "Threat record deleted.",
        type: "success",
      });
    }
    setConfirmState({
      isOpen: false,
      threatId: null,
      mode: "single",
    });
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
    <div className="space-y-8 pb-12">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        isOpen={encConfirmState.isOpen}
        title="Decrypt File?"
        message={`This will decrypt the file and restore it to its original location. The encrypted copy will be removed.\n\n${encConfirmState.encryptedPath}`}
        confirmText="Decrypt & Restore"
        onConfirm={handleEncConfirm}
        onCancel={() =>
          setEncConfirmState({
            isOpen: false,
            fileId: null,
            encryptedPath: "",
          })
        }
      />

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={
          confirmState.mode === "all"
            ? "Delete All Threat Records?"
            : "Delete Threat Record?"
        }
        message={
          confirmState.mode === "all"
            ? "All threat records will be permanently deleted. This does not affect files on disk."
            : "This threat record will be permanently deleted. This does not affect files on disk."
        }
        confirmText={
          confirmState.mode === "all" ? "Delete All" : "Delete Record"
        }
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmState({
            isOpen: false,
            threatId: null,
            mode: "single",
          })
        }
      />

      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Threat Intelligence</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="border rounded-2xl p-4 md:p-5 shadow-xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300"
            style={cardStyle}
          >
            <div
              className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}
            >
              <stat.icon size={22} />
            </div>
            <div>
              <p className="uppercase tracking-widest" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                {stat.label}
              </p>
              <p className="mt-1 tracking-tight" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stat.count.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout: table + detail panel */}
      <div
        className={`flex gap-6 transition-all duration-300 ${selectedThreat ? "items-start" : ""}`}
      >
        {/* Threat table */}
        <div
          className={`border rounded-2xl shadow-xl overflow-hidden flex-1 min-w-0 transition-all duration-300 ${selectedThreat ? "max-w-[calc(100%-340px)]" : "w-full"}`}
          style={cardStyle}
        >
          <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="flex items-center gap-3 tracking-tight" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <AlertTriangle className="text-rose-500" size={20} />
              Active Threat Registry
              {filtered.length !== alerts.length && (
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  ({filtered.length} of {alerts.length})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-40">
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div className="w-40">
                <CustomSelect
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={SEVERITY_OPTIONS}
                />
              </div>
              {alerts.length > 0 && (
                <button
                  onClick={() =>
                    setConfirmState({
                      isOpen: true,
                      threatId: null,
                      mode: "all",
                    })
                  }
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors border border-rose-500/20 uppercase tracking-wider"
                >
                  <Trash2 size={14} /> Delete All
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', color: 'var(--text-disabled)' }} className="text-xs uppercase tracking-wider">
                  <th className="py-4 px-5 font-semibold">
                    Threat ID
                  </th>
                  <th className="py-4 px-5 font-semibold">Sev.</th>
                  <th className="py-4 px-5 font-semibold">
                    Type / Source
                  </th>
                  <th className="py-4 px-5 font-semibold">Status</th>
                  <th className="py-4 px-5 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <ShieldCheck
                          size={48}
                          className="opacity-20 mb-2"
                        />
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                          {alerts.length === 0
                            ? "Environment Secure"
                            : "No matches found"}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {alerts.length === 0
                            ? "No active threats detected."
                            : "Adjust your filters."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((threat) => {
                    const NextIcon =
                      STATUS_ICON[NEXT_STATUS[threat.status]] ||
                      ChevronRight;
                    const isSelected =
                      selectedThreat?.id === threat.id;
                    const loading = actionLoading[threat.id];
                    return (
                      <tr
                        key={threat.id}
                        className={`group transition-colors cursor-pointer ${isSelected ? "bg-indigo-500/5 border-l-2 border-indigo-500" : ""}`}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-row)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                        onClick={() =>
                          setSelectedThreat(
                            isSelected ? null : (threat as Alert),
                          )
                        }
                      >
                        <td className="py-4 px-5">
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                            THR-
                            {String(threat.id)
                              .slice(-6)
                              .padStart(6, "0")}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${getSeverityStyles(threat.severity)}`}
                          >
                            {threat.severity}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="tracking-tight" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
                              {threat.type}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              {threat.source}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusStyles(threat.status)}`}
                          >
                            {threat.status}
                          </span>
                        </td>
                        <td
                          className="py-4 px-5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {/* View detail */}
                            <button
                              onClick={() =>
                                setSelectedThreat(
                                  isSelected
                                    ? null
                                    : (threat as Alert),
                                )
                              }
                              className="p-2 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-lg transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {/* Advance status */}
                            <button
                              onClick={() =>
                                handleAdvanceStatus(threat as Alert)
                              }
                              className="p-2 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              title={`Advance to ${NEXT_STATUS_LABEL[threat.status]}`}
                            >
                              <NextIcon size={16} />
                            </button>
                            {threat.status !== "Resolved" && (
                              <>
                                {/* Quarantine */}
                                <button
                                  onClick={() =>
                                    handleQuarantine(threat as Alert)
                                  }
                                  disabled={!!loading}
                                  className="p-2 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors disabled:opacity-40"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Quarantine File"
                                >
                                  {loading === "quarantine" ? (
                                    <Spinner />
                                  ) : (
                                    <FolderX size={16} />
                                  )}
                                </button>
                                {/* Encrypt */}
                                <button
                                  onClick={() =>
                                    handleEncrypt(threat as Alert)
                                  }
                                  disabled={!!loading}
                                  className="p-2 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors disabled:opacity-40"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Encrypt File (Safe)"
                                >
                                  {loading === "encrypt" ? (
                                    <Spinner />
                                  ) : (
                                    <Lock size={16} />
                                  )}
                                </button>
                                {/* Delete file */}
                                <button
                                  onClick={() =>
                                    handleDeleteFile(threat as Alert)
                                  }
                                  disabled={!!loading}
                                  className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors disabled:opacity-40"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Delete File (Destructive)"
                                >
                                  {loading === "deletefile" ? (
                                    <Spinner />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </>
                            )}
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
          <div
            className="w-80 shrink-0 border rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-200"
            style={cardStyle}
          >
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Threat Detail
              </h3>
              <button
                onClick={() => setSelectedThreat(null)}
                className="p-1 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px' }} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  THR-
                  {String(selectedThreat.id)
                    .slice(-6)
                    .padStart(6, "0")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${getSeverityStyles(selectedThreat.severity)}`}
                >
                  {selectedThreat.severity}
                </span>
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

              {/* Structured Policy Violation Details */}
              {selectedThreat.details &&
                selectedThreat.details.policiesViolated?.length >
                  0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      <FileText size={12} /> Policy Violations (
                      {selectedThreat.details.totalMatches} total)
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedThreat.details.policiesViolated.map(
                        (pv, i) => (
                          <div
                            key={i}
                            className="rounded-xl p-3 space-y-2"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                {pv.policyName}
                              </span>
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                                {pv.matchCount} match
                                {pv.matchCount > 1 ? "es" : ""}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {pv.matches.slice(0, 10).map((m, j) => (
                                <div
                                  key={j}
                                  className="flex items-start gap-2 text-xs"
                                >
                                  <span className="text-amber-500 font-mono font-bold shrink-0 min-w-[4rem]">
                                    Ln {m.lineNumber}:{m.columnNumber}
                                  </span>
                                  <CopyableText
                                    text={m.matchedText}
                                    className="text-rose-400/80 font-mono break-all"
                                    iconSize={12}
                                  />
                                </div>
                              ))}
                              {pv.matches.length > 10 && (
                                <p className="text-xs font-bold" style={{ color: 'var(--text-disabled)' }}>
                                  … and {pv.matches.length - 10} more
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* File path */}
              {selectedThreat.filePath && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <MapPin size={11} /> File Path
                  </div>
                  <CopyableText
                    text={selectedThreat.filePath}
                    className="text-indigo-400 text-xs font-mono break-all"
                    iconSize={14}
                  />
                  {/* Open / Show in Folder buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        try {
                          await fileActionsService.openFile(
                            selectedThreat.filePath!,
                          );
                        } catch (err: any) {
                          setToast({
                            message:
                              err.message || "Failed to open file.",
                            type: "error",
                          });
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ExternalLink size={12} /> Open File
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fileActionsService.showInFolder(
                            selectedThreat.filePath!,
                          );
                        } catch (err: any) {
                          setToast({
                            message:
                              err.message || "Failed to open folder.",
                            type: "error",
                          });
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-lg text-xs font-bold transition-colors"
                    >
                      <FolderOpen size={12} /> Show in Folder
                    </button>
                  </div>
                </div>
              )}

              {/* Time */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} /> Detected
                </div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedThreat.time}
                </p>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Status
                </p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusStyles(selectedThreat.status)}`}
                >
                  {selectedThreat.status}
                </span>
              </div>

              <hr style={{ borderColor: 'var(--border)' }} />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  File Actions
                </p>

                <button
                  onClick={() => handleAdvanceStatus(selectedThreat)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl text-sm font-bold transition-colors"
                >
                  {(() => {
                    const I =
                      STATUS_ICON[NEXT_STATUS[selectedThreat.status]];
                    return <I size={16} />;
                  })()}
                  Mark as {NEXT_STATUS_LABEL[selectedThreat.status]}
                </button>

                {selectedThreat.filePath &&
                  selectedThreat.status !== "Resolved" && (
                    <>
                      <button
                        onClick={() =>
                          handleQuarantine(selectedThreat)
                        }
                        disabled={!!actionLoading[selectedThreat.id]}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading[selectedThreat.id] ===
                        "quarantine" ? (
                          <Spinner />
                        ) : (
                          <FolderX size={16} />
                        )}
                        Quarantine File
                      </button>
                      <button
                        onClick={() => handleEncrypt(selectedThreat)}
                        disabled={!!actionLoading[selectedThreat.id]}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading[selectedThreat.id] ===
                        "encrypt" ? (
                          <Spinner />
                        ) : (
                          <Lock size={16} />
                        )}
                        Encrypt File
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteFile(selectedThreat)
                        }
                        disabled={!!actionLoading[selectedThreat.id]}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading[selectedThreat.id] ===
                        "deletefile" ? (
                          <Spinner />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Delete File
                      </button>
                    </>
                  )}

                <button
                  onClick={() =>
                    handleDeleteRecord(selectedThreat.id)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgb(251, 113, 133)'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'; e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <X size={16} /> Delete Record Only
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Encrypted File Vault ─────────────────────────── */}
      <div
        className="border rounded-2xl shadow-xl overflow-hidden"
        style={cardStyle}
      >
        <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="flex items-center gap-3 tracking-tight" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Lock className="text-emerald-500" size={20} />
            Encrypted File Vault
            {encryptedFiles.length > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                ({encryptedFiles.length})
              </span>
            )}
          </h2>
          <button
            onClick={fetchEncryptedFiles}
            disabled={encLoadingFiles}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--hover-row)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = ''; }}
          >
            <RefreshCw
              size={14}
              className={encLoadingFiles ? "animate-spin" : ""}
            />{" "}
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', color: 'var(--text-disabled)' }} className="text-xs uppercase tracking-wider">
                <th className="py-4 px-5 font-semibold">File</th>
                <th className="py-4 px-5 font-semibold">
                  Original Path
                </th>
                <th className="py-4 px-5 font-semibold">Encrypted</th>
                <th className="py-4 px-5 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {encLoadingFiles ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                      <RefreshCw
                        size={28}
                        className="animate-spin opacity-30"
                      />
                      <p className="text-sm font-bold">
                        Loading encrypted files…
                      </p>
                    </div>
                  </td>
                </tr>
              ) : encryptedFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <ShieldCheck
                        size={40}
                        className="opacity-20 mb-1"
                      />
                      <p className="text-base font-bold" style={{ color: 'var(--text-tertiary)' }}>
                        No Encrypted Files
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Files you encrypt from threats above will
                        appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                encryptedFiles.map((file) => {
                  const isActing = !!encActionLoading[file.id];
                  return (
                    <tr
                      key={file.id}
                      className="group transition-colors"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-row)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={16}
                            className="text-emerald-500 shrink-0"
                          />
                          <span className="font-bold text-sm truncate max-w-52" style={{ color: 'var(--text-primary)' }}>
                            {getFileName(file.encryptedPath)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          <CopyableText
                            text={file.originalPath}
                            className="text-xs font-mono break-all max-w-80"
                            iconSize={12}
                          />
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          {formatEncDate(file.encryptedAt)}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setEncConfirmState({
                                isOpen: true,
                                fileId: file.id,
                                encryptedPath: file.encryptedPath,
                              })
                            }
                            disabled={isActing}
                            className="p-2 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors disabled:opacity-40"
                            style={{ color: 'var(--text-muted)' }}
                            title="Decrypt & Restore"
                          >
                            {encActionLoading[file.id] ===
                            "decrypt" ? (
                              <Spinner />
                            ) : (
                              <Unlock size={16} />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleEncShowInFolder(
                                file.encryptedPath,
                              )
                            }
                            className="p-2 hover:bg-violet-500/10 hover:text-violet-400 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            title="Show in Folder"
                          >
                            <FolderOpen size={16} />
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
    </div>
  );
}
