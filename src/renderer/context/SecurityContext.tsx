"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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

interface SecurityContextType {
  scans: Scan[];
  alerts: Alert[];
  policies: Policy[];
  totalFilesScanned: number;
  isAuthenticated: boolean;
  user: UserProfile | null;
  runScan: (
    type: string,
    target: string,
    path: string,
  ) => Promise<void>;
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
}

const SecurityContext = createContext<
  SecurityContextType | undefined
>(undefined);

// Helper function to map API policies to UI policies
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

// Helper function to map API scans to UI scans
function mapApiScanToUi(apiScan: ApiScan): Scan {
  const completedTime = apiScan.completedAt
    ? new Date(apiScan.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";
  return {
    id: apiScan.id,
    time: completedTime,
    type:
      apiScan.scanType.charAt(0).toUpperCase() +
      apiScan.scanType.slice(1),
    files: apiScan.filesScanned.toLocaleString(),
    threats: apiScan.totalThreats,
    status:
      apiScan.status.charAt(0).toUpperCase() +
      apiScan.status.slice(1),
  };
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
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [policies, setPolicies] = useState<Policy[]>([]);

  // Check authentication status on mount
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

          // Load policies and scans after successful auth
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

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("dlp_theme") as
      | "light"
      | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Sync theme to localStorage
  useEffect(() => {
    localStorage.setItem("dlp_theme", theme);
  }, [theme]);

  // Refresh policies from server
  const refreshPolicies = async () => {
    try {
      const apiPolicies = await policyService.getAllPolicies();
      const uiPolicies = apiPolicies.map(mapApiPolicyToUi);
      setPolicies(uiPolicies);
    } catch (error) {
      console.error("Failed to load policies:", error);
    }
  };

  // Refresh scans from server
  const refreshScans = async () => {
    try {
      const { scans: apiScans } = await scannerService.getAllScans();
      const uiScans = apiScans.map(mapApiScanToUi);
      setScans(uiScans);

      // Calculate total files scanned
      const total = apiScans.reduce(
        (sum, scan) => sum + scan.filesScanned,
        0,
      );
      setTotalFilesScanned(total);
    } catch (error) {
      console.error("Failed to load scans:", error);
    }
  };

  // Run a new scan
  const runScan = async (
    type: string,
    target: string,
    path: string,
  ) => {
    try {
      // Determine scan type
      let scanType: "full" | "quick" | "custom" = "quick";
      if (type.toLowerCase().includes("full")) {
        scanType = "full";
      } else if (type.toLowerCase().includes("custom")) {
        scanType = "custom";
      }

      // Start the scan
      const result = await scannerService.startScan({
        scanType,
        targetPath: path || process.cwd(),
        options: {},
      });

      // Poll for scan completion
      const scanId = result.scanId;
      const pollInterval = setInterval(async () => {
        try {
          const scanData = await scannerService.getScanById(scanId);

          if (scanData.status !== "running") {
            clearInterval(pollInterval);

            // Refresh scans list
            await refreshScans();

            // Generate alerts if threats found
            if (scanData.totalThreats > 0) {
              const statuses: (
                | "New"
                | "Quarantined"
                | "Investigating"
              )[] = ["New", "Quarantined", "Investigating"];
              const newAlerts: Alert[] = Array.from({
                length: Math.min(scanData.totalThreats, 5),
              }).map((_, i) => ({
                id: Date.now() + i,
                severity:
                  scanData.totalThreats > 5 ? "High" : "Medium",
                time: new Date()
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0],
                type: "Policy Violation: Sensitive Content",
                description: `Detected ${scanData.totalThreats} threats in ${scanData.filesWithThreats} files during ${type}.`,
                source: type,
                status:
                  statuses[
                    Math.floor(Math.random() * statuses.length)
                  ],
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
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Resolved" } : a,
      ),
    );
  };

  const deleteAlert = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAllAlerts = () => setAlerts([]);
  const clearAllScans = () => setScans([]);

  // Login with actual API
  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({
        username,
        password,
      });

      const newUser: UserProfile = {
        name: response.user.username,
        email: `${response.user.username.toLowerCase()}@example.com`,
        role: "Security Administrator",
        bio: "Dashboard administrator managing Data Leak Prevention policies.",
      };

      setIsAuthenticated(true);
      setUser(newUser);

      // Load policies and scans after login
      await refreshPolicies();
      await refreshScans();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // Logout with actual API
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
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

  // Add a new policy
  const addPolicy = async (p: Omit<Policy, "id">) => {
    try {
      const newPolicy = await policyService.createPolicy({
        name: p.name,
        pattern: p.pattern,
        type: p.type.toLowerCase() === "regex" ? "regex" : "keyword",
        description: p.description,
      });

      const uiPolicy = mapApiPolicyToUi(newPolicy);
      setPolicies((prev) => [uiPolicy, ...prev]);
    } catch (error) {
      console.error("Failed to create policy:", error);
      throw error;
    }
  };

  // Update an existing policy
  const updatePolicy = async (p: Policy) => {
    try {
      const updated = await policyService.updatePolicy(
        parseInt(p.id),
        {
          name: p.name,
          pattern: p.pattern,
          type:
            p.type.toLowerCase() === "regex" ? "regex" : "keyword",
          description: p.description,
          isEnabled: p.status === "Active",
        },
      );

      const uiPolicy = mapApiPolicyToUi(updated);
      setPolicies((prev) =>
        prev.map((policy) =>
          policy.id === p.id ? uiPolicy : policy,
        ),
      );
    } catch (error) {
      console.error("Failed to update policy:", error);
      throw error;
    }
  };

  // Toggle policy status
  const togglePolicyStatus = async (id: string) => {
    try {
      const updated = await policyService.togglePolicy(parseInt(id));
      const uiPolicy = mapApiPolicyToUi(updated);
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? uiPolicy : p)),
      );
    } catch (error) {
      console.error("Failed to toggle policy:", error);
      throw error;
    }
  };

  // Delete a policy
  const deletePolicy = async (id: string) => {
    try {
      await policyService.deletePolicy(parseInt(id));
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete policy:", error);
      throw error;
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <SecurityContext.Provider
      value={{
        scans,
        alerts,
        policies,
        totalFilesScanned,
        isAuthenticated,
        user,
        theme,
        runScan,
        resolveAlert,
        clearAllAlerts,
        clearAllScans,
        deleteAlert,
        login,
        logout,
        updateUserProfile,
        addPolicy,
        updatePolicy,
        togglePolicyStatus,
        deletePolicy,
        toggleTheme,
        refreshPolicies,
        refreshScans,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error(
      "useSecurity must be used within a SecurityProvider",
    );
  }
  return context;
}
