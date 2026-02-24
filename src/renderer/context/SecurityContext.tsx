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
  Policy as ApiPolicy,
  Scan as ApiScan,
  User,
} from "@/lib/api";
import { getSocket, disconnectSocket, SystemMetrics, SocketAlert } from "@/lib/api/socket";

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

interface SecurityContextType {
  scans: Scan[];
  alerts: Alert[];
  policies: Policy[];
  totalFilesScanned: number;
  isAuthenticated: boolean;
  user: UserProfile | null;
  systemMetrics: SystemMetrics;
  runScan: (type: string, target: string, path: string) => Promise<void>;
  resolveAlert: (id: number) => void;
  clearAllAlerts: () => void;
  clearAllScans: () => void;
  deleteAlert: (id: number) => void;
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
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const DEFAULT_METRICS: SystemMetrics = { cpu: 0, memory: 0, network: 0, activeSessions: 0 };

function mapApiPolicyToUi(apiPolicy: ApiPolicy): Policy {
  return {
    id: apiPolicy.id.toString(),
    name: apiPolicy.name,
    description: apiPolicy.description || "",
    type: apiPolicy.type.toUpperCase(),
    pattern: apiPolicy.pattern,
    status: apiPolicy.isEnabled ? "Active" : "Disabled",
  };
}

function mapApiScanToUi(apiScan: ApiScan): Scan {
  const completedTime = apiScan.completedAt
    ? new Date(apiScan.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  return {
    id: apiScan.id,
    time: completedTime,
    type: apiScan.scanType.charAt(0).toUpperCase() + apiScan.scanType.slice(1),
    files: apiScan.filesScanned.toLocaleString(),
    threats: apiScan.totalThreats,
    status: apiScan.status.charAt(0).toUpperCase() + apiScan.status.slice(1),
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
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>({
    realTime: true,
    autoResponse: false,
    notifications: true,
    sensitivity: "Medium",
  });

  const socketInitialized = useRef(false);
  // Keep a ref that always reflects latest realTime value
  // so socket callbacks don't need to re-register on every change
  const realTimeRef = useRef(true);

  // Keep realTimeRef in sync with monitoringSettings.realTime
  useEffect(() => {
    realTimeRef.current = monitoringSettings.realTime;
  }, [monitoringSettings.realTime]);

  // Initialize socket listeners once
  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    const socket = getSocket();

    // Metrics: only update when realTime is on
    socket.on("metrics:update", (metrics: SystemMetrics) => {
      if (!realTimeRef.current) return;
      setSystemMetrics(metrics);
    });

    // New alert: only process when realTime is on
    socket.on("alert:new", (alert: SocketAlert) => {
      if (!realTimeRef.current) return;
      setAlerts((prev) => {
        if (prev.find((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    });

    // Scan progress: only update when realTime is on
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

    // Scan complete: refresh regardless (user triggered this action)
    socket.on("scan:complete", async () => {
      await refreshScans();
    });

    // Live scanner activity: only when realTime is on
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

  // Check authentication on mount
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
        } catch (error) {
          console.error("Session verification failed:", error);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };
    checkAuth();
  }, []);

  // Theme persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("dlp_theme") as "light" | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("dlp_theme", theme);
  }, [theme]);

  // Load saved monitoring settings
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

  const updateMonitoringSettings = (settings: Partial<MonitoringSettings>) => {
    setMonitoringSettings((prev) => {
      const updated = { ...prev, ...settings };
      localStorage.setItem("dlp_monitoring_settings", JSON.stringify(updated));
      // Keep ref in sync immediately
      if (settings.realTime !== undefined) {
        realTimeRef.current = settings.realTime;
      }
      return updated;
    });
  };

  const refreshPolicies = async () => {
    try {
      const apiPolicies = await policyService.getAllPolicies();
      setPolicies(apiPolicies.map(mapApiPolicyToUi));
    } catch (error) {
      console.error("Failed to load policies:", error);
    }
  };

  const refreshScans = async () => {
    try {
      const { scans: apiScans } = await scannerService.getAllScans();
      setScans(apiScans.map(mapApiScanToUi));
      setTotalFilesScanned(apiScans.reduce((sum, scan) => sum + scan.filesScanned, 0));
    } catch (error) {
      console.error("Failed to load scans:", error);
    }
  };

  const runScan = async (type: string, target: string, path: string) => {
    try {
      let scanType: "full" | "quick" | "custom" = "quick";
      if (type.toLowerCase().includes("full")) scanType = "full";
      else if (type.toLowerCase().includes("custom")) scanType = "custom";

      const result = await scannerService.startScan({
        scanType,
        targetPath: path || process.cwd(),
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
                description: `Detected ${scanData.totalThreats} threats in ${scanData.filesWithThreats} files during ${type}.`,
                source: type,
                status: "New" as const,
              }));
              setAlerts((prev) => [...newAlerts, ...prev]);
            }
          }
        } catch (error) {
          console.error("Error polling scan status:", error);
          clearInterval(pollInterval);
        }
      }, 2000);
    } catch (error) {
      console.error("Failed to start scan:", error);
      throw error;
    }
  };

  const resolveAlert = (id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
  };
  const deleteAlert = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const clearAllAlerts = () => setAlerts([]);
  const clearAllScans = () => setScans([]);

  const login = async (username: string, password: string) => {
    try {
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
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
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

  const addPolicy = async (p: Omit<Policy, "id">) => {
    try {
      const newPolicy = await policyService.createPolicy({
        name: p.name,
        pattern: p.pattern,
        type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
        description: p.description,
      });
      setPolicies((prev) => [mapApiPolicyToUi(newPolicy), ...prev]);
    } catch (error) {
      console.error("Failed to create policy:", error);
      throw error;
    }
  };

  const updatePolicy = async (p: Policy) => {
    try {
      const updated = await policyService.updatePolicy(parseInt(p.id), {
        name: p.name,
        pattern: p.pattern,
        type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
        description: p.description,
        isEnabled: p.status === "Active",
      });
      setPolicies((prev) => prev.map((policy) => (policy.id === p.id ? mapApiPolicyToUi(updated) : policy)));
    } catch (error) {
      console.error("Failed to update policy:", error);
      throw error;
    }
  };

  const togglePolicyStatus = async (id: string) => {
    try {
      const updated = await policyService.togglePolicy(parseInt(id));
      setPolicies((prev) => prev.map((p) => (p.id === id ? mapApiPolicyToUi(updated) : p)));
    } catch (error) {
      console.error("Failed to toggle policy:", error);
      throw error;
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      await policyService.deletePolicy(parseInt(id));
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete policy:", error);
      throw error;
    }
  };

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <SecurityContext.Provider
      value={{
        scans, alerts, policies, totalFilesScanned, isAuthenticated, user,
        systemMetrics, theme, monitoringSettings,
        runScan, resolveAlert, clearAllAlerts, clearAllScans, deleteAlert,
        login, logout, updateUserProfile,
        addPolicy, updatePolicy, togglePolicyStatus, deletePolicy,
        toggleTheme, refreshPolicies, refreshScans, updateMonitoringSettings,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
}