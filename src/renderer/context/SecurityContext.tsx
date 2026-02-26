"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  authService, policyService, scannerService, getSessionId,
  Policy as ApiPolicy, Scan as ApiScan, User,
} from "@/lib/api";
import { getSocket, disconnectSocket, SystemMetrics, SocketAlert } from "@/lib/api/socket";
import { fileActionsService, monitoringApiService } from "@/lib/api/fileActions.service";

interface Scan {
  id: number; time: string; type: string; files: string; threats: number; status: string;
}

interface Alert {
  id: number; severity: "High" | "Medium" | "Low"; time: string; type: string;
  description: string; source: string;
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

// ── Scan progress — lives in context so it survives page navigation ───────────
export interface ScanState {
  activeScanId: number | null;
  totalFiles: number;
  filesScanned: number;
  filesWithThreats: number;
  totalThreats: number;
  currentFile: string;
  startTime: number | null;
  endTime: number | null;
  status: "idle" | "running" | "completed" | "failed";
}

export const IDLE_SCAN: ScanState = {
  activeScanId: null, totalFiles: 0, filesScanned: 0,
  filesWithThreats: 0, totalThreats: 0, currentFile: "",
  startTime: null, endTime: null, status: "idle",
};

interface SecurityContextType {
  scans: Scan[];
  alerts: Alert[];
  policies: Policy[];
  totalFilesScanned: number;
  isAuthenticated: boolean;
  user: UserProfile | null;
  systemMetrics: SystemMetrics;
  // Scan progress — persists across navigation
  scanState: ScanState;
  setScanState: (updates: Partial<ScanState>) => void;
  runScan: (
    type: string,
    target: string,
    scanPath: string,
    onComplete?: (threatsFound: number) => void,
    extraOptions?: {
      mlTier?: "base" | "small" | "tiny";
      excludedKeywords?: string[];
      whitelistedPaths?: string[];
    }
  ) => Promise<any>;
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
  updateMonitoringSettings: (settings: Partial<MonitoringSettings>) => void;
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
  const [scans, setScans]                   = useState<Scan[]>([]);
  const [alerts, setAlerts]                 = useState<Alert[]>([]);
  const [totalFilesScanned, setTotalFilesScanned] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]                     = useState<UserProfile | null>(null);
  const [theme, setTheme]                   = useState<"light" | "dark">("dark");
  const [policies, setPolicies]             = useState<Policy[]>([]);
  const [systemMetrics, setSystemMetrics]   = useState<SystemMetrics>(DEFAULT_METRICS);
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>({
    realTime: true, autoResponse: false, notifications: true, sensitivity: "Medium",
  });

  // ── Scan progress state — survives navigation because it's in context ─────
  const [scanState, setScanStateRaw] = useState<ScanState>(IDLE_SCAN);
  const scanStateRef = useRef<ScanState>(IDLE_SCAN);

  const setScanState = (updates: Partial<ScanState>) => {
    setScanStateRaw((prev) => {
      const next = { ...prev, ...updates };
      scanStateRef.current = next;
      return next;
    });
  };

  const socketInitialized = useRef(false);
  const realTimeRef = useRef(true);

  useEffect(() => { realTimeRef.current = monitoringSettings.realTime; }, [monitoringSettings.realTime]);

  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;
    const socket = getSocket();

    socket.on("metrics:update", (metrics: SystemMetrics) => {
      if (!realTimeRef.current) return;
      setSystemMetrics(metrics);
    });

    socket.on("alert:new", (alert: Alert) => {
      if (!realTimeRef.current) return;
      setAlerts((prev) => {
        if (prev.find((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    });

    // ── Scan progress socket events — handled here so they survive navigation ─
    socket.on("scan:start", (data: any) => {
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({ totalFiles: data.totalFiles, startTime: Date.now() });
    });

    socket.on("scan:progress", (data: any) => {
      // Update scans list in sidebar
      setScans((prev) =>
        prev.map((s) =>
          s.id === data.scanId
            ? { ...s, files: data.filesScanned.toString(), threats: data.totalThreats, status: data.status }
            : s
        )
      );
      // Update progress bar — only if this is the active scan
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({
        filesScanned:     data.filesScanned,
        filesWithThreats: data.filesWithThreats,
        totalThreats:     data.totalThreats,
        totalFiles:       data.totalFiles,
        currentFile:      data.currentFile || "",
      });
    });

    socket.on("scan:complete", async (data: any) => {
      await refreshScans();
      // Update progress bar — only if this is the active scan
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({
        filesScanned: data.filesScanned,
        totalThreats: data.totalThreats,
        totalFiles:   data.totalFiles ?? scanStateRef.current.totalFiles,
        currentFile:  "",
        endTime:      Date.now(),
        status:       "completed",
        activeScanId: null,
      });
    });

    socket.on("liveScanner:activity", (activity: any) => {
      if (!realTimeRef.current) return;
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
      socket.off("scan:start");
      socket.off("scan:progress");
      socket.off("scan:complete");
      socket.off("liveScanner:activity");
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = getSessionId();
      if (sessionId) {
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
        } catch {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dlp_theme") as "light" | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => { localStorage.setItem("dlp_theme", theme); }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("dlp_monitoring_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMonitoringSettings(parsed);
        realTimeRef.current = parsed.realTime ?? true;
      } catch {}
    }
  }, []);

  const updateMonitoringSettings = async (settings: Partial<MonitoringSettings>) => {
    setMonitoringSettings((prev) => {
      const updated = { ...prev, ...settings };
      localStorage.setItem("dlp_monitoring_settings", JSON.stringify(updated));
      if (settings.realTime !== undefined) realTimeRef.current = settings.realTime;
      return updated;
    });

    if (settings.realTime === true) {
      try { await monitoringApiService.startMonitoring(monitoringSettings.autoResponse); }
      catch (err) { console.warn("[Monitor] Could not start live monitoring:", err); }
    } else if (settings.realTime === false) {
      try { await monitoringApiService.stopMonitoring(); }
      catch (err) { console.warn("[Monitor] Could not stop live monitoring:", err); }
    }

    if (settings.autoResponse !== undefined) {
      try { await monitoringApiService.updateAutoResponse(settings.autoResponse); }
      catch (err) { console.warn("[Monitor] Could not update auto-response:", err); }
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
    type: string,
    target: string,
    scanPath: string,
    onComplete?: (threatsFound: number) => void,
    extraOptions?: {
      mlTier?: "base" | "small" | "tiny";
      excludedKeywords?: string[];
      whitelistedPaths?: string[];
    },
  ) => {
    let scanType: "full" | "quick" | "custom" = "quick";
    if (type.toLowerCase().includes("full"))        scanType = "full";
    else if (type.toLowerCase().includes("custom")) scanType = "custom";

    const result = await scannerService.startScan({
      scanType,
      targetPath: scanPath || process.cwd(),
      options: { ...(extraOptions || {}) },
    });

    // Register onComplete callback against this scanId
    // The scan:complete socket listener above fires setScanState,
    // this just additionally calls the page's toast callback
    const socket = getSocket();
    const handler = (data: any) => {
      if (data.scanId !== result.scanId) return;
      socket.off("scan:complete", handler);
      onComplete?.(data.totalThreats ?? 0);
    };
    socket.on("scan:complete", handler);
    setTimeout(() => socket.off("scan:complete", handler), 10 * 60 * 1000);

    return result;
  };

  // ── Alert management ──────────────────────────────────────────────────────
  const resolveAlert     = (id: number) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "Resolved" } : a));
  const updateAlertStatus = (id: number, status: Alert["status"]) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  const deleteAlert      = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const deleteAllAlerts  = () => setAlerts([]);
  const clearAllAlerts   = () => setAlerts([]);

  const clearAllScans = async () => {
    try { await scannerService.deleteAllScans(); } catch {}
    setScans([]);
    setTotalFilesScanned(0);
  };

  // ── File actions ──────────────────────────────────────────────────────────
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

  // ── Auth ──────────────────────────────────────────────────────────────────
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
  };

  const logout = async () => {
    try { await authService.logout(); } finally {
      disconnectSocket();
      socketInitialized.current = false;
      setIsAuthenticated(false);
      setUser(null);
      setPolicies([]);
      setScans([]);
      setAlerts([]);
      setScanState(IDLE_SCAN);
    }
  };

  const updateUserProfile = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem("dlp_user", JSON.stringify(profile));
  };

  // ── Policy management ─────────────────────────────────────────────────────
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
    setPolicies((prev) => prev.map((pol) => pol.id === p.id ? mapApiPolicyToUi(updated) : pol));
  };

  const togglePolicyStatus = async (id: string) => {
    const updated = await policyService.togglePolicy(parseInt(id));
    setPolicies((prev) => prev.map((p) => p.id === id ? mapApiPolicyToUi(updated) : p));
  };

  const deletePolicy = async (id: string) => {
    await policyService.deletePolicy(parseInt(id));
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleTheme = () => setTheme((prev) => prev === "light" ? "dark" : "light");

  return (
    <SecurityContext.Provider value={{
      scans, alerts, policies, totalFilesScanned, isAuthenticated, user,
      systemMetrics, theme, monitoringSettings,
      scanState, setScanState,
      runScan, resolveAlert, updateAlertStatus, clearAllAlerts, clearAllScans,
      deleteAlert, deleteAllAlerts,
      login, logout, updateUserProfile,
      addPolicy, updatePolicy, togglePolicyStatus, deletePolicy,
      toggleTheme, refreshPolicies, refreshScans, updateMonitoringSettings,
      quarantineFile, encryptFile, deleteFile,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) throw new Error("useSecurity must be used within a SecurityProvider");
  return context;
}