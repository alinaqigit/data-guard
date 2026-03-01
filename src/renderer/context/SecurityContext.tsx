"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  authService, policyService, scannerService, getSessionId,
  Policy as ApiPolicy, Scan as ApiScan, User,
} from "@/lib/api";
import { getSocket, disconnectSocket, SystemMetrics, SocketAlert } from "@/lib/api/socket";
import { fileActionsService, monitoringApiService } from "@/lib/api/fileActions.service";
import Toast from "@/components/Toast";

interface Scan {
  id: number;
  time: string;
  type: string;
  files: string;
  threats: number;
  status: string;
}

interface Alert {
  id: number;
  severity: "High" | "Medium" | "Low";
  time: string;
  type: string;
  description: string;
  source: string;
  status: "New" | "Resolved" | "Quarantined" | "Investigating";
  filePath?: string;
}

interface UserProfile { name: string; email: string; role: string; bio: string; }

interface Policy {
  id: string; name: string; description: string;
  type: string; pattern: string; status: "Active" | "Disabled";
}

interface MonitoringSettings {
  realTime: boolean; autoResponse: boolean;
  notifications: boolean; sensitivity: "Low" | "Medium" | "High";
}

interface SecurityContextType {
  scans: Scan[];
  alerts: Alert[];
  policies: Policy[];
  totalFilesScanned: number;
  isAuthenticated: boolean;
  user: UserProfile | null;
  systemMetrics: SystemMetrics;
  runScan: (type: string, target: string, path: string, onComplete?: (threatsFound: number) => void) => Promise<void>;
  resolveAlert: (id: number) => void;
  updateAlertStatus: (id: number, status: Alert["status"]) => void;
  clearAllAlerts: () => void;
  clearAllScans: () => Promise<void>;
  deleteAlert: (id: number) => void;
  deleteAllAlerts: () => void;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  addPolicy: (policy: Omit<Policy, "id">) => Promise<void>;
  updatePolicy: (policy: Policy) => Promise<void>;
  togglePolicyStatus: (id: string) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  refreshPolicies: () => Promise<void>;
  refreshScans: () => Promise<void>;
  monitoringSettings: MonitoringSettings;
  updateMonitoringSettings: (settings: Partial<MonitoringSettings>) => Promise<void>;
  quarantineFile: (alertId: number, filePath: string) => Promise<void>;
  encryptFile: (alertId: number, filePath: string) => Promise<void>;
  deleteFile: (alertId: number, filePath: string) => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);
const DEFAULT_METRICS: SystemMetrics = { cpu: 0, memory: 0, network: 0, activeSessions: 0 };

function mapApiPolicyToUi(p: ApiPolicy): Policy {
  return {
    id: p.id.toString(), name: p.name, description: p.description || "",
    type: p.type.toUpperCase(), pattern: p.pattern,
    status: p.isEnabled ? "Active" : "Disabled",
  };
}

function mapApiScanToUi(s: ApiScan): Scan {
  const completedTime = s.completedAt
    ? new Date(s.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  return {
    id: s.id,
    time: completedTime,
    type: s.scanType.charAt(0).toUpperCase() + s.scanType.slice(1),
    files: s.filesScanned.toLocaleString(),
    threats: s.totalThreats,
    status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
  };
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalFilesScanned, setTotalFilesScanned] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>(DEFAULT_METRICS);

  // Load saved settings from localStorage as initial state
  const loadSavedSettings = (): MonitoringSettings => {
    try {
      const saved = localStorage.getItem("dlp_monitoring_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { realTime: true, autoResponse: false, notifications: true, sensitivity: "Medium" };
  };

  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>(loadSavedSettings);

  const socketInitialized = useRef(false);
  // realTimeRef always mirrors monitoringSettings.realTime for use in socket callbacks
  const realTimeRef = useRef(monitoringSettings.realTime);

  // Global toast state — shown on any page
  const [globalToast, setGlobalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const prevAlertsLengthRef = useRef(0);

  // Keep realTimeRef in sync with state
  useEffect(() => {
    realTimeRef.current = monitoringSettings.realTime;
  }, [monitoringSettings.realTime]);

  // ── Show global toast when new alerts arrive ────────────────────────────────
  useEffect(() => {
    if (alerts.length > prevAlertsLengthRef.current) {
      const newest = alerts[0];
      if (newest && monitoringSettings.notifications) {
        const isEncryption = newest.source === "Auto-Response";
        setGlobalToast({
          message: isEncryption
            ? `Auto-encrypted: ${newest.description}`
            : `⚠️ Threat detected: ${newest.description}`,
          type: isEncryption ? "success" : "error",
        });
      }
    }
    prevAlertsLengthRef.current = alerts.length;
  }, [alerts, monitoringSettings.notifications]);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    const socket = getSocket();

    socket.on("metrics:update", (metrics: SystemMetrics) => {
      if (!realTimeRef.current) return;
      setSystemMetrics(metrics);
    });

    socket.on("alert:new", (alert: Alert) => {
      setAlerts((prev) => {
        if (prev.find((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    });

    socket.on("scan:progress", (progress: any) => {
      if (!realTimeRef.current) return;
      setScans((prev) =>
        prev.map((s) =>
          s.id === progress.scanId
            ? { ...s, files: progress.filesScanned.toString(), threats: progress.totalThreats, status: progress.status }
            : s
        )
      );
    });

    socket.on("scan:complete", async () => { await refreshScans(); });

    socket.on("liveScanner:activity", (activity: any) => {
      if (activity.threatsFound > 0) {
        const newAlert: Alert = {
          id: Date.now(),
          severity: activity.threatsFound > 3 ? "High" : "Medium",
          time: new Date().toISOString().replace("T", " ").split(".")[0],
          type: "Live Monitor: File Change Detected",
          description: `${activity.threatsFound} threat(s) found in ${activity.filePath}`,
          source: "Live Monitor",
          status: "New",
          filePath: activity.filePath,
        };
        setAlerts((prev) => [newAlert, ...prev]);
      }
    });

    return () => {
      socket.off("metrics:update");
      socket.off("alert:new");
      socket.off("scan:progress");
      socket.off("scan:complete");
      socket.off("liveScanner:activity");
    };
  }, []);

  // ── Auth check on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;
      try {
        const userData = await authService.verifySession();
        setIsAuthenticated(true);
        setUser({
          name: userData.username,
          email: `${userData.username.toLowerCase()}@example.com`,
          role: "Security Administrator",
          bio: "Dashboard administrator managing Data Leak Prevention policies.",
        });
        await refreshPolicies();
        await refreshScans();

        // Auto-start live monitor based on saved settings
        // Delay slightly to ensure socket connection is established
        const saved = loadSavedSettings();
        if (saved.realTime !== false) {
          setTimeout(() => {
            monitoringApiService
              .startMonitoring(saved.autoResponse ?? false)
              .catch((err) => console.warn("[Monitor] Auto-start failed:", err));
          }, 1500);
        }
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dlp_theme") as "light" | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => { localStorage.setItem("dlp_theme", theme); }, [theme]);

  // ── Update monitoring settings and persist ──────────────────────────────────
  const updateMonitoringSettings = async (settings: Partial<MonitoringSettings>) => {
    const current = monitoringSettings;
    const updated = { ...current, ...settings };

    // Update state and persist to localStorage
    setMonitoringSettings(updated);
    realTimeRef.current = updated.realTime;
    localStorage.setItem("dlp_monitoring_settings", JSON.stringify(updated));

    // Start/stop backend monitoring based on realTime toggle
    if (settings.realTime === true) {
      try {
        await monitoringApiService.startMonitoring(updated.autoResponse);
      } catch (err) {
        console.warn("[Monitor] Could not start live monitoring:", err);
      }
    } else if (settings.realTime === false) {
      try {
        await monitoringApiService.stopMonitoring();
      } catch (err) {
        console.warn("[Monitor] Could not stop live monitoring:", err);
      }
    }

    // Update auto-response on backend if changed
    if (settings.autoResponse !== undefined) {
      try {
        await monitoringApiService.updateAutoResponse(settings.autoResponse);
      } catch (err) {
        console.warn("[Monitor] Could not update auto-response:", err);
      }
    }
  };

  const refreshPolicies = async () => {
    try {
      const apiPolicies = await policyService.getAllPolicies();
      setPolicies(apiPolicies.map(mapApiPolicyToUi));
    } catch {}
  };

  const refreshScans = async () => {
    try {
      const { scans: apiScans } = await scannerService.getAllScans();
      setScans(apiScans.map(mapApiScanToUi));
      setTotalFilesScanned(apiScans.reduce((sum, s) => sum + s.filesScanned, 0));
    } catch {}
  };

  const runScan = async (
    type: string, target: string, scanPath: string,
    onComplete?: (threatsFound: number) => void,
  ) => {
    let scanType: "full" | "quick" | "custom" = "quick";
    if (type.toLowerCase().includes("full")) scanType = "full";
    else if (type.toLowerCase().includes("custom")) scanType = "custom";

    const result = await scannerService.startScan({
      scanType,
      targetPath: scanPath || process.cwd(),
      options: {},
    });

    const pollInterval = setInterval(async () => {
      try {
        const scanData = await scannerService.getScanById(result.scanId);
        if (scanData.status !== "running") {
          clearInterval(pollInterval);
          await refreshScans();
          if (scanData.totalThreats > 0) {
            const newAlerts: Alert[] = Array.from({ length: Math.min(scanData.totalThreats, 5) }).map((_, i) => ({
              id: Date.now() + i,
              severity: scanData.totalThreats > 5 ? "High" : "Medium",
              time: new Date().toISOString().replace("T", " ").split(".")[0],
              type: "Policy Violation: Sensitive Content",
              description: `Detected ${scanData.totalThreats} threat(s) in ${scanData.filesWithThreats} file(s) during ${type} scan.`,
              source: type,
              status: "New" as const,
              filePath: scanData.targetPath,
            }));
            setAlerts((prev) => [...newAlerts, ...prev]);
          }
          onComplete?.(scanData.totalThreats);
        }
      } catch {
        clearInterval(pollInterval);
        onComplete?.(-1);
      }
    }, 2000);
  };

  // ── Alert management ────────────────────────────────────────────────────────
  const resolveAlert = (id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
  };
  const updateAlertStatus = (id: number, status: Alert["status"]) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };
  const deleteAlert = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const deleteAllAlerts = () => setAlerts([]);
  const clearAllAlerts = () => setAlerts([]);

  const clearAllScans = async () => {
    try { await scannerService.deleteAllScans(); } catch {}
    setScans([]);
    setTotalFilesScanned(0);
  };

  // ── File actions ────────────────────────────────────────────────────────────
  const quarantineFile = async (alertId: number, filePath: string) => {
    await fileActionsService.quarantine(filePath);
    updateAlertStatus(alertId, "Quarantined");
  };

  const encryptFile = async (alertId: number, filePath: string) => {
    await fileActionsService.encrypt(filePath);
    updateAlertStatus(alertId, "Resolved");
  };

  const deleteFile = async (alertId: number, filePath: string) => {
    await fileActionsService.deleteFile(filePath);
    deleteAlert(alertId);
  };

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    setIsAuthenticated(true);
    setUser({
      name: response.user.username,
      email: `${response.user.username.toLowerCase()}@example.com`,
      role: "Security Administrator",
      bio: "Dashboard administrator managing Data Leak Prevention policies.",
    });
    await refreshPolicies();
    await refreshScans();
    // Start monitoring on login if realTime is enabled
    const saved = loadSavedSettings();
    if (saved.realTime !== false) {
      setTimeout(() => {
        monitoringApiService
          .startMonitoring(saved.autoResponse ?? false)
          .catch((err) => console.warn("[Monitor] Auto-start on login failed:", err));
      }, 1500);
    }
  };

  const logout = async () => {
    try {
      await monitoringApiService.stopMonitoring().catch(() => {});
      await authService.logout();
    } finally {
      disconnectSocket();
      socketInitialized.current = false;
      setIsAuthenticated(false);
      setUser(null);
      setPolicies([]);
      setScans([]);
      setAlerts([]);
    }
  };

  const updateUserProfile = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem("dlp_user", JSON.stringify(profile));
  };

  // ── Policy management ───────────────────────────────────────────────────────
  const addPolicy = async (p: Omit<Policy, "id">) => {
    const newPolicy = await policyService.createPolicy({
      name: p.name, pattern: p.pattern,
      type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
      description: p.description,
    });
    setPolicies((prev) => [mapApiPolicyToUi(newPolicy), ...prev]);
  };

  const updatePolicy = async (p: Policy) => {
    const updated = await policyService.updatePolicy(parseInt(p.id), {
      name: p.name, pattern: p.pattern,
      type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
      description: p.description, isEnabled: p.status === "Active",
    });
    setPolicies((prev) => prev.map((pol) => (pol.id === p.id ? mapApiPolicyToUi(updated) : pol)));
  };

  const togglePolicyStatus = async (id: string) => {
    const updated = await policyService.togglePolicy(parseInt(id));
    setPolicies((prev) => prev.map((p) => (p.id === id ? mapApiPolicyToUi(updated) : p)));
  };

  const deletePolicy = async (id: string) => {
    await policyService.deletePolicy(parseInt(id));
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <SecurityContext.Provider value={{
      scans, alerts, policies, totalFilesScanned, isAuthenticated, user,
      systemMetrics, theme, monitoringSettings,
      runScan, resolveAlert, updateAlertStatus, clearAllAlerts, clearAllScans,
      deleteAlert, deleteAllAlerts,
      login, logout, updateUserProfile,
      addPolicy, updatePolicy, togglePolicyStatus, deletePolicy,
      toggleTheme, refreshPolicies, refreshScans, updateMonitoringSettings,
      quarantineFile, encryptFile, deleteFile,
    }}>
      {children}
      {/* Global toast — visible on any page */}
      {globalToast && (
        <Toast
          message={globalToast.message}
          type={globalToast.type}
          onClose={() => setGlobalToast(null)}
        />
      )}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) throw new Error("useSecurity must be used within a SecurityProvider");
  return context;
}