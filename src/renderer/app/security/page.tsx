"use client";

import { useState, useEffect, useRef } from "react";
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
  FolderOpen,
} from "lucide-react";

import { useSecurity } from "@/context/SecurityContext";
import Toast from "@/components/Toast";

// Smoothly animate a number value toward a target
function useSmoothedValue(
  target: number,
  duration = 800,
  paused = false,
): number {
  const [display, setDisplay] = useState(target);
  const animRef = useRef<number | null>(null);
  const startRef = useRef({ from: target, to: target, startTime: 0 });

  useEffect(() => {
    if (paused) return;
    const from = display;
    startRef.current = {
      from,
      to: target,
      startTime: performance.now(),
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (now: number) => {
      const elapsed = now - startRef.current.startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current =
        startRef.current.from +
        (startRef.current.to - startRef.current.from) * eased;
      setDisplay(Math.round(current));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target]);

  return display;
}

function MetricBar({
  value,
  color,
  glowColor,
}: {
  value: number;
  color: string;
  glowColor: string;
}) {
  return (
    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-1)' }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${value}%`,
          background: color,
          boxShadow: `0 0 15px ${glowColor}`,
        }}
      />
    </div>
  );
}

export default function SecurityMonitorPage() {
  const {
    alerts,
    systemMetrics,
    monitoringSettings,
    monitoredPaths,
    watcherReady,
    monitorError,
    updateMonitoringSettings,
  } = useSecurity();

  const [isSaving, setIsSaving] = useState(false);
  const [saveText, setSaveText] = useState("Save Configuration");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  // Local copies of settings so changes are only applied on Save
  const [localSettings, setLocalSettings] = useState(
    monitoringSettings,
  );
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
        const isEncryption = newest.source === "Auto-Response";
        setToast({
          message: isEncryption
            ? `Auto-encrypted: ${newest.description}`
            : `⚠️ Threat detected: ${newest.description}`,
          type: isEncryption ? "success" : "error",
        });
      }
    }
    prevAlertsLengthRef.current = alerts.length;
  }, [alerts]);

  const isRealTimePaused = !monitoringSettings.realTime;
  const smoothCpu = useSmoothedValue(
    systemMetrics.cpu,
    800,
    isRealTimePaused,
  );
  const smoothMemory = useSmoothedValue(
    systemMetrics.memory,
    800,
    isRealTimePaused,
  );
  const smoothNetwork = useSmoothedValue(
    systemMetrics.network,
    800,
    isRealTimePaused,
  );
  const smoothSessions = useSmoothedValue(
    systemMetrics.activeSessions,
    800,
    isRealTimePaused,
  );

  const criticalCount = alerts.filter(
    (a) =>
      a.severity === "High" &&
      (a.status === "New" || a.status === "Investigating"),
  ).length;
  const warningCount = alerts.filter(
    (a) =>
      a.severity === "Medium" &&
      (a.status === "New" || a.status === "Investigating"),
  ).length;
  const activeSessions = smoothSessions;

  const recentActivity =
    alerts.length > 0
      ? alerts.slice(0, 5).map((a) => ({
          id: a.id,
          time: a.time.split(" ")[1] || a.time,
          event: a.type,
          source: a.source,
          type:
            a.severity === "High"
              ? "critical"
              : a.severity === "Medium"
                ? "warning"
                : "info",
        }))
      : [
          {
            id: 1,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            event: "No recent critical events",
            source: "System",
            type: "success",
          },
        ];

  // ── Save applies all local setting changes at once ────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveText("Saving...");
    try {
      await updateMonitoringSettings(localSettings);
      setSaveText("Configuration Saved!");
      setToast({
        message: "Configuration saved successfully.",
        type: "success",
      });
    } catch {
      setToast({
        message: "Failed to save configuration.",
        type: "error",
      });
      setSaveText("Save Configuration");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveText("Save Configuration"), 2000);
    }
  };

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: () => void;
  }) => (
    <div
      className="w-12 h-6 rounded-full flex items-center px-1.5 transition-colors duration-300 cursor-pointer"
      style={{ background: value ? 'var(--brand-light)' : 'var(--surface-1)' }}
      onClick={onChange}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${value ? "translate-x-5" : "translate-x-0"}`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Security Monitor
        </h1>
        <div className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--success-alt)' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: 'var(--success)' }}></span>
          </span>
          System Online
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Live Monitoring Dashboard */}
          <div
            className="border rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Activity size={20} style={{ color: 'var(--brand-light)' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Live Monitoring Dashboard
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--danger-a10)', border: '1px solid var(--danger-a20)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--danger)' }}>
                  Critical Alerts
                </p>
                <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {criticalCount}
                </span>
                <p className="text-xs mt-2 font-bold" style={{ color: 'var(--danger)', opacity: 0.6 }}>
                  High severity · Active
                </p>
              </div>
              <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--warning-a10)', border: '1px solid var(--warning-a20)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--warning)' }}>
                  Warnings
                </p>
                <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {warningCount}
                </span>
                <p className="text-xs mt-2 font-bold" style={{ color: 'var(--warning)', opacity: 0.6 }}>
                  Medium severity · Active
                </p>
              </div>
              <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--brand-a10)', border: '1px solid var(--brand-a20)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-light)' }}>
                  Active Sessions
                </p>
                <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeSessions}
                </span>
                <p className="text-xs mt-2 font-bold" style={{ color: 'var(--brand-light)', opacity: 0.6 }}>
                  Connected clients
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity Stream */}
          <div
            className="border rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
          >
            <h3 className="mb-6 flex items-center gap-3" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Activity size={20} style={{ color: 'var(--brand-light)' }} />
              Recent Activity Stream
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-5 p-4 rounded-xl transition-colors border border-transparent group"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-row)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="mt-1 p-2 rounded-full"
                    style={{
                      background: activity.type === "critical" ? 'var(--danger-a20)'
                        : activity.type === "warning" ? 'var(--warning-a20)'
                        : activity.type === "success" ? 'var(--success-a20)'
                        : 'var(--brand-a20)',
                      color: activity.type === "critical" ? 'var(--danger)'
                        : activity.type === "warning" ? 'var(--warning)'
                        : activity.type === "success" ? 'var(--success)'
                        : 'var(--brand-light)',
                    }}
                  >
                    {activity.type === "critical" ? (
                      <AlertTriangle size={18} />
                    ) : activity.type === "warning" ? (
                      <Eye size={18} />
                    ) : activity.type === "success" ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Activity size={18} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-base tracking-tight" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {activity.event}
                      </p>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      {activity.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Monitoring Controls */}
          <div
            className="border rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
          >
            <h3 className="mb-8 flex items-center gap-3" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Settings size={20} style={{ color: 'var(--brand-light)' }} />
              Monitoring Controls
            </h3>

            <div className="space-y-6">
              <div className="space-y-6">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="transition-colors" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Real-time Monitoring
                    </span>
                    <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Stream live alerts and events
                    </p>
                  </div>
                  <Toggle
                    value={localSettings.realTime}
                    onChange={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        realTime: !prev.realTime,
                      }))
                    }
                  />
                </label>

                <hr style={{ borderColor: 'var(--border)' }} />

                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="transition-colors" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Auto-response
                    </span>
                    <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Auto-encrypt files on threat detection
                    </p>
                  </div>
                  <Toggle
                    value={localSettings.autoResponse}
                    onChange={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        autoResponse: !prev.autoResponse,
                      }))
                    }
                  />
                </label>

                <hr style={{ borderColor: 'var(--border)' }} />

                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="transition-colors" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Push Notifications
                    </span>
                    <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Alert on new threats detected
                    </p>
                  </div>
                  <Toggle
                    value={localSettings.notifications}
                    onChange={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        notifications: !prev.notifications,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-3"
                  style={{ background: isSaving ? 'var(--success)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '13px', fontWeight: 600 }}
                  onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'var(--brand-main)'; }}
                  onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'var(--brand-light)'; }}
                >
                  {isSaving && (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {saveText}
                </button>
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div
            className="border rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
          >
            <h3 className="mb-8 flex items-center gap-3" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <BarChart3 size={20} style={{ color: 'var(--success)' }} />
              System Metrics
            </h3>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                    <Cpu size={16} /> CPU Usage
                  </span>
                  <span className="font-bold" style={{ color: 'var(--brand-light)' }}>
                    {smoothCpu}%
                  </span>
                </div>
                <MetricBar
                  value={smoothCpu}
                  color="var(--brand-light)"
                  glowColor="var(--brand-a50)"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                    <Server size={16} /> Memory Usage
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: smoothMemory > 85 ? 'var(--danger)' : smoothMemory > 70 ? 'var(--warning)' : 'var(--success)' }}
                  >
                    {smoothMemory}%
                  </span>
                </div>
                <MetricBar
                  value={smoothMemory}
                  color={
                    smoothMemory > 85
                      ? "var(--danger)"
                      : smoothMemory > 70
                        ? "var(--warning)"
                        : "var(--success)"
                  }
                  glowColor={
                    smoothMemory > 85
                      ? "var(--danger-a50)"
                      : smoothMemory > 70
                        ? "var(--warning-a50)"
                        : "var(--success-a30)"
                  }
                />
              </div>
              <div>
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                    <Globe size={16} /> Network Traffic
                  </span>
                  <span className="font-bold" style={{ color: 'var(--success)' }}>
                    {smoothNetwork}%
                  </span>
                </div>
                <MetricBar
                  value={smoothNetwork}
                  color="var(--success)"
                  glowColor="var(--success-a30)"
                />
              </div>
            </div>

            <div
              className="mt-6 flex items-center gap-2 text-xs font-bold"
              style={{
                color: isRealTimePaused ? "var(--warning)" : "var(--text-muted)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: isRealTimePaused ? 'var(--warning)' : 'var(--success)' }}
                ></span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: isRealTimePaused ? 'var(--warning)' : 'var(--success)' }}
                ></span>
              </span>
              {isRealTimePaused
                ? "Paused · Real-time monitoring is off"
                : "Live · Updates every 3 seconds"}
            </div>
          </div>

          {/* Monitored Directories */}
          <div
            className="border rounded-2xl p-4 md:p-5"
            style={{ background: 'var(--background-card)', borderColor: 'var(--border)' }}
          >
            <h3 className="mb-4 flex items-center gap-3" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <FolderOpen size={20} style={{ color: 'var(--warning)' }} />
              Monitored Directories
              {monitoringSettings.realTime && (
                <span
                  className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${!watcherReady && monitoredPaths.length > 0 ? 'animate-pulse' : ''}`}
                  style={{
                    background: watcherReady ? 'var(--success-a20)' : monitoredPaths.length > 0 ? 'var(--warning-a20)' : 'var(--neutral-a10)',
                    color: watcherReady ? 'var(--success)' : monitoredPaths.length > 0 ? 'var(--warning)' : 'var(--text-disabled)',
                    border: watcherReady ? '1px solid var(--success-a30)' : monitoredPaths.length > 0 ? '1px solid var(--warning-a30)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {watcherReady
                    ? "Active"
                    : monitoredPaths.length > 0
                      ? "Initializing…"
                      : "Starting…"}
                </span>
              )}
            </h3>
            {monitoredPaths.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {monitoredPaths.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                  >
                    <FolderOpen
                      size={16}
                      className="shrink-0"
                      style={{ color: 'var(--warning)', opacity: 0.6 }}
                    />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                      {p}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p
                className="text-sm font-medium"
                style={{ color: monitorError ? 'var(--danger)' : 'var(--text-muted)' }}
              >
                {isRealTimePaused
                  ? "Real-time monitoring is off. Enable it to see monitored directories."
                  : monitorError
                    ? `Failed to start: ${monitorError}`
                    : "Starting monitor…"}
              </p>
            )}
            <p className="text-xs mt-3 font-medium" style={{ color: 'var(--text-disabled)' }}>
              {monitoredPaths.length > 0
                ? `${monitoredPaths.length} directories watched recursively`
                : ""}
            </p>
          </div>
        </div>
      </div>

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
