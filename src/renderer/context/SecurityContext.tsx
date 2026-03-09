"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  authService,
  policyService,
  scannerService,
  getSessionId,
  setRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials,
  Policy as ApiPolicy,
  Scan as ApiScan,
  User,
  threatsService,
  ApiThreatDetails,
} from "@/lib/api";
import {
  getSocket,
  disconnectSocket,
  SystemMetrics,
  SocketAlert,
} from "@/lib/api/socket";
import {
  fileActionsService,
  monitoringApiService,
} from "@/lib/api/fileActions.service";
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
  details?: ApiThreatDetails | null;
  source: string;
  status: "New" | "Resolved" | "Quarantined" | "Investigating";
  filePath?: string;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
  bio: string;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  status: "Active" | "Disabled";
}

interface MonitoringSettings {
  realTime: boolean;
  autoResponse: boolean;
  notifications: boolean;
  sensitivity: "Low" | "Medium" | "High";
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
  activeScanId: null,
  totalFiles: 0,
  filesScanned: 0,
  filesWithThreats: 0,
  totalThreats: 0,
  currentFile: "",
  startTime: null,
  endTime: null,
  status: "idle",
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
    },
  ) => Promise<any>;
  resolveAlert: (id: number) => void;
  updateAlertStatus: (id: number, status: Alert["status"]) => void;
  clearAllAlerts: () => void;
  clearAllScans: () => Promise<void>;
  deleteAlert: (id: number) => void;
  deleteAllAlerts: () => void;
  login: (
    username: string,
    pass: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  theme: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  setThemePreference: (pref: "light" | "dark" | "system") => void;
  addPolicy: (policy: Omit<Policy, "id">) => Promise<void>;
  updatePolicy: (policy: Policy) => Promise<void>;
  togglePolicyStatus: (id: string) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  refreshPolicies: () => Promise<void>;
  refreshScans: () => Promise<void>;
  refreshThreats: () => Promise<void>;
  monitoringSettings: MonitoringSettings;
  monitoredPaths: string[];
  watcherReady: boolean;
  monitorError: string | null;
  updateMonitoringSettings: (
    settings: Partial<MonitoringSettings>,
  ) => void;
  quarantineFile: (
    alertId: number,
    filePath: string,
  ) => Promise<void>;
  encryptFile: (alertId: number, filePath: string) => Promise<void>;
  deleteFile: (alertId: number, filePath: string) => Promise<void>;
}

const SecurityContext = createContext<
  SecurityContextType | undefined
>(undefined);
const DEFAULT_METRICS: SystemMetrics = {
  cpu: 0,
  memory: 0,
  network: 0,
  activeSessions: 0,
};

function mapApiPolicyToUi(p: ApiPolicy): Policy {
  return {
    id: p.id.toString(),
    name: p.name,
    description: p.description || "",
    type: p.type.toUpperCase(),
    pattern: p.pattern,
    status: p.isEnabled ? "Active" : "Disabled",
  };
}

function mapApiScanToUi(s: ApiScan): Scan {
  const completedTime = s.completedAt
    ? new Date(s.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
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

function loadSavedSettings(): Partial<MonitoringSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("dlp_monitoring_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function SecurityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalFilesScanned, setTotalFilesScanned] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [systemMetrics, setSystemMetrics] =
    useState<SystemMetrics>(DEFAULT_METRICS);
  const [monitoringSettings, setMonitoringSettings] =
    useState<MonitoringSettings>({
      realTime: true,
      autoResponse: false,
      notifications: true,
      sensitivity: "Medium",
    });
  const [monitoredPaths, setMonitoredPaths] = useState<string[]>([]);
  const [watcherReady, setWatcherReady] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(
    null,
  );
  const [globalToast, setGlobalToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

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
  const prevAlertsLengthRef = useRef(0);
  // realTimeRef always mirrors monitoringSettings.realTime for use in socket callbacks
  const realTimeRef = useRef(monitoringSettings.realTime);

  useEffect(() => {
    realTimeRef.current = monitoringSettings.realTime;
  }, [monitoringSettings.realTime]);

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
            : `Threat detected: ${newest.description}`,
          type: isEncryption ? "success" : "warning",
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

    const handleMetrics = (metrics: SystemMetrics) => {
      if (!realTimeRef.current) return;
      setSystemMetrics(metrics);
    };

    const handleAlertNew = (alert: Alert) => {
      console.log(
        "[SecurityContext] handleAlertNew received:",
        alert,
      );
      setAlerts((prev) => {
        if (prev.find((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    };

    // ── Scan progress socket events — handled here so they survive navigation ─
    const handleCtxScanStart = (data: any) => {
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({
        totalFiles: data.totalFiles,
        startTime: Date.now(),
      });
    };

    // Throttle context scan progress to avoid flooding React with re-renders
    let ctxProgressTimer: ReturnType<typeof setTimeout> | null = null;
    let latestCtxProgress: any = null;

    const flushCtxProgress = () => {
      const data = latestCtxProgress;
      if (!data) return;
      latestCtxProgress = null;
      // Update scans list in sidebar
      setScans((prev) =>
        prev.map((s) =>
          s.id === data.scanId
            ? {
                ...s,
                files: data.filesScanned.toString(),
                threats: data.totalThreats,
                status: data.status,
              }
            : s,
        ),
      );
      // Update progress bar — only if this is the active scan
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({
        filesScanned: data.filesScanned,
        filesWithThreats: data.filesWithThreats,
        totalThreats: data.totalThreats,
        totalFiles: data.totalFiles,
        currentFile: data.currentFile || "",
      });
    };

    const handleCtxScanProgress = (data: any) => {
      latestCtxProgress = data;
      if (!ctxProgressTimer) {
        ctxProgressTimer = setTimeout(() => {
          ctxProgressTimer = null;
          flushCtxProgress();
        }, 200);
      }
    };

    const handleCtxScanComplete = async (data: any) => {
      console.log("[SecurityContext] handleCtxScanComplete:", data);
      // Flush any pending throttled progress before marking complete
      if (ctxProgressTimer) {
        clearTimeout(ctxProgressTimer);
        ctxProgressTimer = null;
        latestCtxProgress = null;
      }
      await refreshScans();
      console.log(
        "[SecurityContext] refreshScans done, calling refreshThreats...",
      );
      await refreshThreats();
      console.log("[SecurityContext] refreshThreats done");
      // Update progress bar — only if this is the active scan
      if (scanStateRef.current.activeScanId !== data.scanId) return;
      setScanState({
        filesScanned: data.filesScanned,
        totalThreats: data.totalThreats,
        totalFiles:
          data.totalFiles ?? scanStateRef.current.totalFiles,
        currentFile: "",
        endTime: Date.now(),
        status: "completed",
        activeScanId: null,
      });
    };

    const handleLiveScannerActivity = (activity: any) => {
      console.log("[SecurityContext] liveScanner:activity", activity);
      if (activity.watcherReady) {
        setWatcherReady(true);
        console.log(
          "[SecurityContext] Live scanner watcher is READY",
        );
      }
      if (activity.threatsFound > 0) {
        // Refresh threats from DB — the backend now persists them
        refreshThreats();
      }
    };

    socket.on("metrics:update", handleMetrics);
    socket.on("alert:new", handleAlertNew);
    socket.on("scan:start", handleCtxScanStart);
    socket.on("scan:progress", handleCtxScanProgress);
    socket.on("scan:complete", handleCtxScanComplete);
    socket.on("liveScanner:activity", handleLiveScannerActivity);

    return () => {
      socket.off("metrics:update", handleMetrics);
      socket.off("alert:new", handleAlertNew);
      socket.off("scan:start", handleCtxScanStart);
      socket.off("scan:progress", handleCtxScanProgress);
      socket.off("scan:complete", handleCtxScanComplete);
      socket.off("liveScanner:activity", handleLiveScannerActivity);
      if (ctxProgressTimer) {
        clearTimeout(ctxProgressTimer);
        ctxProgressTimer = null;
      }
    };
  }, []);

  // ── Auth check on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = getSessionId();
      let authenticated = false;

      // 1. Try verifying existing session
      if (sessionId) {
        try {
          const userData = await authService.verifySession();
          setIsAuthenticated(true);
          setUser({
            name: userData.username,
            email: userData.email || '',
            role: "Security Administrator",
            bio: userData.bio || '',
          });
          await refreshPolicies();
          await refreshScans();
          console.log(
            "[SecurityContext] checkAuth: calling refreshThreats...",
          );
          await refreshThreats();
          console.log(
            "[SecurityContext] checkAuth: refreshThreats done",
          );
          // Monitoring auto-start is handled by the isAuthenticated effect below
        } catch {
          // Session expired — try auto-login with remembered credentials
          const remembered = getRememberedCredentials();
          if (remembered) {
            try {
              await login(
                remembered.username,
                remembered.password,
                true,
              );
              return; // login succeeded, skip fallback
            } catch {
              clearRememberedCredentials();
            }
          }
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        // No session — try auto-login with remembered credentials
        const remembered = getRememberedCredentials();
        if (remembered) {
          try {
            await login(
              remembered.username,
              remembered.password,
              true,
            );
          } catch {
            clearRememberedCredentials();
          }
        }
      }

      if (!authenticated) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      await refreshPolicies();
      await refreshScans();

      // Auto-start live monitor based on saved settings
      const saved = loadSavedSettings();
      if (saved.realTime !== false) {
        setTimeout(() => {
          monitoringApiService
            .startMonitoring(saved.autoResponse ?? false)
            .catch((err) => console.warn("[Monitor] Auto-start failed:", err));
        }, 1500);
      }
    };
    checkAuth();
  }, []);

  // ── Auto-start live monitor whenever user becomes authenticated ─────────────
  // This covers ALL login paths: verifySession, remembered credentials, manual login
  useEffect(() => {
    if (!isAuthenticated) return;
    const saved = localStorage.getItem("dlp_monitoring_settings");
    const savedSettings = saved ? JSON.parse(saved) : null;
    if (savedSettings && savedSettings.realTime === false) return; // user disabled real-time
    console.log(
      "[Monitor] isAuthenticated=true, auto-starting live monitor...",
    );
    setWatcherReady(false);
    setMonitorError(null);
    monitoringApiService
      .startMonitoring(savedSettings?.autoResponse ?? false)
      .then((res) => {
        console.log("[Monitor] Auto-start response:", res);
        if (res?.monitoredPaths)
          setMonitoredPaths(res.monitoredPaths);
        setMonitorError(null);
      })
      .catch((err) => {
        const msg = err?.message || err?.error || String(err);
        console.warn("[Monitor] Auto-start failed:", msg);
        setMonitorError(msg);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dlp_theme") as
      | "light"
      | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("dlp_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dlp_theme", theme);

    const applyResolvedTheme = (resolved: "light" | "dark") => {
      const html = document.documentElement;
      html.setAttribute("data-theme", resolved);
      html.classList.remove("light", "dark");
      html.classList.add(resolved);
      setResolvedTheme(resolved);
    };

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      applyResolvedTheme(mql.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => applyResolvedTheme(e.matches ? "dark" : "light");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else {
      applyResolvedTheme(theme);
    }
  }, [theme]);

  const updateMonitoringSettings = async (
    settings: Partial<MonitoringSettings>,
  ) => {
    setMonitoringSettings((prev) => {
      const updated = { ...prev, ...settings };
      localStorage.setItem(
        "dlp_monitoring_settings",
        JSON.stringify(updated),
      );
      if (settings.realTime !== undefined)
        realTimeRef.current = settings.realTime;
      return updated;
    });

    // Start/stop backend monitoring based on realTime toggle
    if (settings.realTime === true) {
      try {
        setWatcherReady(false);
        setMonitorError(null);
        const res = await monitoringApiService.startMonitoring(
          monitoringSettings.autoResponse,
        );
        console.log("[Monitor] Start response:", res);
        if (res?.monitoredPaths)
          setMonitoredPaths(res.monitoredPaths);
      } catch (err: any) {
        const msg = err?.message || err?.error || String(err);
        console.warn(
          "[Monitor] Could not start live monitoring:",
          msg,
        );
        setMonitorError(msg);
      }
    } else if (settings.realTime === false) {
      try {
        await monitoringApiService.stopMonitoring();
        setMonitoredPaths([]);
        setWatcherReady(false);
      } catch (err) {
        console.warn(
          "[Monitor] Could not stop live monitoring:",
          err,
        );
      }
    }

    // Update auto-response on backend if changed
    if (settings.autoResponse !== undefined) {
      try {
        await monitoringApiService.updateAutoResponse(
          settings.autoResponse,
        );
      } catch (err) {
        console.warn(
          "[Monitor] Could not update auto-response:",
          err,
        );
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
      setTotalFilesScanned(
        apiScans.reduce((sum, s) => sum + s.filesScanned, 0),
      );
    } catch {}
  };

  const refreshThreats = async () => {
    try {
      const { threats } = await threatsService.getAllThreats();
      console.log(
        "[SecurityContext] refreshThreats: fetched",
        threats.length,
        "threats from API",
      );
      setAlerts(
        threats.map((t) => ({
          id: t.id,
          severity: t.severity,
          time: new Date(t.createdAt)
            .toISOString()
            .replace("T", " ")
            .split(".")[0],
          type: t.type,
          description: t.description,
          details: t.details ?? null,
          source: t.source,
          status: t.status,
          filePath: t.filePath,
        })),
      );
    } catch (err) {
      console.error("[SecurityContext] refreshThreats failed:", err);
    }
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
    if (type.toLowerCase().includes("full")) scanType = "full";
    else if (type.toLowerCase().includes("custom"))
      scanType = "custom";

    const result = await scannerService.startScan({
      scanType,
      targetPath: scanPath || "/",
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
    setTimeout(
      () => socket.off("scan:complete", handler),
      10 * 60 * 1000,
    );

    return result;
  };

  // ── Alert management ──────────────────────────────────────────────────────
  const resolveAlert = (id: number) => {
    threatsService.updateThreatStatus(id, "Resolved").catch(() => {});
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Resolved" } : a,
      ),
    );
  };
  const updateAlertStatus = (id: number, status: Alert["status"]) => {
    threatsService.updateThreatStatus(id, status).catch(() => {});
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  };
  const deleteAlert = (id: number) => {
    threatsService.deleteThreat(id).catch(() => {});
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };
  const deleteAllAlerts = () => {
    threatsService.deleteAllThreats().catch(() => {});
    setAlerts([]);
  };
  const clearAllAlerts = () => {
    threatsService.deleteAllThreats().catch(() => {});
    setAlerts([]);
  };

  const clearAllScans = async () => {
    try {
      await scannerService.deleteAllScans();
    } catch {}
    setScans([]);
    setTotalFilesScanned(0);
  };

  // ── File actions ──────────────────────────────────────────────────────────
  const quarantineFile = async (
    alertId: number,
    filePath: string,
  ) => {
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
  const login = async (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => {
    const response = await authService.login({ username, password });
    setIsAuthenticated(true);
    setUser({
      name: response.user.username,
      email: response.user.email || '',
      role: "Security Administrator",
      bio: response.user.bio || '',
    });
    if (rememberMe) {
      setRememberedCredentials(username, password);
    } else if (rememberMe === false) {
      clearRememberedCredentials();
    }
    await refreshPolicies();
    await refreshScans();
    await refreshThreats();
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearRememberedCredentials();
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

  const updateUserProfile = async (profile: UserProfile) => {
    try {
      const updated = await authService.updateProfile({
        name: profile.name,
        email: profile.email,
        bio: profile.bio,
      });
      setUser({
        name: updated.username,
        email: updated.email || '',
        role: profile.role,
        bio: updated.bio || '',
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  // ── Policy management ───────────────────────────────────────────────────────
  const addPolicy = async (p: Omit<Policy, "id">) => {
    const newPolicy = await policyService.createPolicy({
      name: p.name,
      pattern: p.pattern,
      type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
      description: p.description,
    });
    setPolicies((prev) => [mapApiPolicyToUi(newPolicy), ...prev]);
  };

  const updatePolicy = async (p: Policy) => {
    const updated = await policyService.updatePolicy(parseInt(p.id), {
      name: p.name,
      pattern: p.pattern,
      type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
      description: p.description,
      isEnabled: p.status === "Active",
    });
    setPolicies((prev) =>
      prev.map((pol) =>
        pol.id === p.id ? mapApiPolicyToUi(updated) : pol,
      ),
    );
  };

  const togglePolicyStatus = async (id: string) => {
    const updated = await policyService.togglePolicy(parseInt(id));
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? mapApiPolicyToUi(updated) : p)),
    );
  };

  const deletePolicy = async (id: string) => {
    await policyService.deletePolicy(parseInt(id));
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const setThemePreference = (pref: "light" | "dark" | "system") =>
    setTheme(pref);

  return (
    <SecurityContext.Provider
      value={{
        scans,
        alerts,
        policies,
        totalFilesScanned,
        isAuthenticated,
        user,
        systemMetrics,
        theme,
        resolvedTheme,
        setThemePreference,
        monitoringSettings,
        monitoredPaths,
        watcherReady,
        monitorError,
        scanState,
        setScanState,
        runScan,
        resolveAlert,
        updateAlertStatus,
        clearAllAlerts,
        clearAllScans,
        deleteAlert,
        deleteAllAlerts,
        login,
        logout,
        updateUserProfile,
        addPolicy,
        updatePolicy,
        togglePolicyStatus,
        deletePolicy,
        refreshPolicies,
        refreshScans,
        refreshThreats,
        updateMonitoringSettings,
        quarantineFile,
        encryptFile,
        deleteFile,
      }}
    >
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
  if (!context)
    throw new Error(
      "useSecurity must be used within a SecurityProvider",
    );
  return context;
}
