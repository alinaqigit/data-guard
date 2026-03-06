"use client";

import { useState, useEffect } from "react";
import { Bell, Eye, CheckCircle2, Trash2, Info } from "lucide-react";

import { useSecurity } from "@/context/SecurityContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import CopyableText from "@/components/CopyableText";

export default function AlertsPage() {
  const {
    alerts,
    resolveAlert,
    clearAllAlerts,
    deleteAlert,
    refreshThreats,
  } = useSecurity();

  useEffect(() => {
    refreshThreats();
  }, []);
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
        <h1 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
          Alerts Center
        </h1>
        {/* Summary badges */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase border bg-red-500/10 text-red-500 border-red-500/20">
              {
                alerts.filter(
                  (a) =>
                    a.severity === "High" && a.status !== "Resolved",
                ).length
              }{" "}
              Critical
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              {
                alerts.filter(
                  (a) =>
                    a.severity === "Medium" &&
                    a.status !== "Resolved",
                ).length
              }{" "}
              Warnings
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              {alerts.filter((a) => a.status === "Resolved").length}{" "}
              Resolved
            </span>
          </div>
        )}
      </div>

      <div
        className="border rounded-2xl shadow-xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #020617 0%, #000000 100%)",
          borderColor: "rgba(51, 65, 85, 0.3)",
        }}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            <Bell className="text-blue-500" size={28} />
            Security Alerts
            {alerts.length > 0 && (
              <span className="text-sm font-bold text-neutral-500">
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
              <tr className="bg-white/5 border-b border-white/10 text-neutral-400 text-sm font-black uppercase tracking-[0.1em]">
                <th className="py-4 px-5">Severity</th>
                <th className="py-4 px-5">Time</th>
                <th className="py-4 px-5">Alert Type</th>
                <th className="py-4 px-5">Description</th>
                <th className="py-4 px-5">Source</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-white/5 rounded-full text-neutral-500">
                        <Bell size={64} />
                      </div>
                      <p className="text-neutral-400 font-black text-2xl">
                        No alerts found
                      </p>
                      <p className="text-neutral-600 text-lg font-medium">
                        Everything looks secure for now.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-black uppercase border ${getSeverityStyles(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="text-neutral-300 text-sm font-bold">
                        {alert.time}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-white text-sm font-black tracking-tight">
                        {alert.type}
                      </span>
                    </td>
                    <td className="py-4 px-5 min-w-[280px]">
                      <CopyableText
                        text={alert.description}
                        className="text-neutral-400 text-sm font-medium leading-relaxed"
                      />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Info size={14} />
                        <span className="text-sm font-bold">
                          {alert.source}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-3 py-1 rounded text-xs font-black uppercase border ${getStatusStyles(alert.status)}`}
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
                          className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
