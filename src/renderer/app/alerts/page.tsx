"use client";

import { useState } from "react";
import { Bell, Eye, CheckCircle2, Trash2, Info } from "lucide-react";

import { useSecurity } from "@/context/SecurityContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import CopyableText from "@/components/CopyableText";

export default function AlertsPage() {
  const { alerts, resolveAlert, clearAllAlerts, deleteAlert } =
    useSecurity();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(
    null,
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "High":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Low":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-neutral-800 text-neutral-400";
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Investigating":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "Quarantined":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "New":
      default:
        return "bg-neutral-800 text-neutral-400 border-neutral-700/50";
    }
  };

  const handleClearAll = () => {
    clearAllAlerts();
    setShowClearConfirm(false);
    setToast({ message: "All alerts cleared.", type: "success" });
  };

  const handleDeleteOne = () => {
    if (deleteTargetId !== null) {
      deleteAlert(deleteTargetId);
      setDeleteTargetId(null);
      setToast({ message: "Alert deleted.", type: "success" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Alerts Center
        </h1>
        {/* Summary badges */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase border bg-red-500/10 text-red-500 border-red-500/20">
              {
                alerts.filter(
                  (a) =>
                    a.severity === "High" && a.status !== "Resolved",
                ).length
              }{" "}
              Critical
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              {
                alerts.filter(
                  (a) =>
                    a.severity === "Medium" &&
                    a.status !== "Resolved",
                ).length
              }{" "}
              Warnings
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              {alerts.filter((a) => a.status === "Resolved").length}{" "}
              Resolved
            </span>
          </div>
        )}
      </div>

      <div
        className="border rounded-2xl overflow-hidden"
        style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="flex items-center gap-3 tracking-tight" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Bell className="text-blue-500" size={20} />
            Security Alerts
            {alerts.length > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                ({alerts.length})
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={alerts.length === 0}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 border border-red-500/50 hover:border-red-500 px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            <Trash2 size={16} />
            Delete All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', color: 'var(--text-disabled)' }}>
                <th className="py-4 px-5">Severity</th>
                <th className="py-4 px-5">Time</th>
                <th className="py-4 px-5">Alert Type</th>
                <th className="py-4 px-5">Description</th>
                <th className="py-4 px-5">Source</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 rounded-full" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
                        <Bell size={48} />
                      </div>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                        No alerts found
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-disabled)' }}>
                        Everything looks secure for now.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="group transition-colors"
                    style={{ cursor: 'default' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-row)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${getSeverityStyles(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {alert.time}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {alert.type}
                      </span>
                    </td>
                    <td className="py-4 px-5 min-w-[280px]">
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                        <CopyableText
                          text={alert.description}
                          className="leading-relaxed"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Info size={14} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          {alert.source}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold uppercase border ${getStatusStyles(alert.status)}`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1">
                        {alert.status !== "Resolved" && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            title="Mark as Resolved"
                            className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <CheckCircle2 size={17} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(alert.id)}
                          title="Delete Alert"
                          className="p-2 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          style={{ color: 'var(--text-disabled)' }}
                        >
                          <Trash2 size={17} />
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

      {/* Delete single alert confirmation */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Alert?"
        message="This alert will be permanently removed from the list."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteOne}
      />

      {/* Delete all confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Delete All Alerts?"
        message="This will permanently remove all alerts. This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        isDestructive={true}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
