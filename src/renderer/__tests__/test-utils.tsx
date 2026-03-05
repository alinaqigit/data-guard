import React from "react";
import { render, RenderOptions } from "@testing-library/react";

// Interfaces matching the shape used by SecurityContext
interface MockScan {
  id: number;
  time: string;
  type: string;
  files: string;
  threats: number;
  status: string;
}

interface MockAlert {
  id: number;
  severity: "High" | "Medium" | "Low";
  time: string;
  type: string;
  description: string;
  source: string;
  status: "New" | "Resolved" | "Quarantined" | "Investigating";
  filePath?: string;
}

interface MockPolicy {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  status: "Active" | "Disabled";
}

// Default mock values for the SecurityContext
export const defaultMockSecurityContext = {
  scans: [] as MockScan[],
  alerts: [] as MockAlert[],
  policies: [] as MockPolicy[],
  totalFilesScanned: 0,
  isAuthenticated: true,
  user: {
    name: "testuser",
    email: "testuser@example.com",
    role: "Security Administrator",
    bio: "Test user bio",
  },
  systemMetrics: {
    cpu: 45,
    memory: 60,
    network: 30,
    activeSessions: 2,
  },
  scanState: {
    activeScanId: null,
    totalFiles: 0,
    filesScanned: 0,
    filesWithThreats: 0,
    totalThreats: 0,
    currentFile: "",
    startTime: null,
    endTime: null,
    status: "idle" as const,
  },
  setScanState: jest.fn(),
  runScan: jest
    .fn()
    .mockResolvedValue({ scanId: 1, message: "Scan started" }),
  resolveAlert: jest.fn(),
  updateAlertStatus: jest.fn(),
  clearAllAlerts: jest.fn(),
  clearAllScans: jest.fn().mockResolvedValue(undefined),
  deleteAlert: jest.fn(),
  deleteAllAlerts: jest.fn(),
  login: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  updateUserProfile: jest.fn(),
  theme: "dark" as const,
  toggleTheme: jest.fn(),
  addPolicy: jest.fn().mockResolvedValue(undefined),
  updatePolicy: jest.fn().mockResolvedValue(undefined),
  togglePolicyStatus: jest.fn().mockResolvedValue(undefined),
  deletePolicy: jest.fn().mockResolvedValue(undefined),
  refreshPolicies: jest.fn().mockResolvedValue(undefined),
  refreshScans: jest.fn().mockResolvedValue(undefined),
  monitoringSettings: {
    realTime: true,
    autoResponse: false,
    notifications: true,
    sensitivity: "Medium" as const,
  },
  updateMonitoringSettings: jest.fn(),
  quarantineFile: jest.fn().mockResolvedValue(undefined),
  encryptFile: jest.fn().mockResolvedValue(undefined),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

// Factory to create a mock with overrides
export function createMockSecurityContext(
  overrides: Partial<typeof defaultMockSecurityContext> = {},
) {
  return { ...defaultMockSecurityContext, ...overrides };
}

// The mock provider setup — useSecurity() will return whatever we configure
let mockContextValue = { ...defaultMockSecurityContext };

export function setMockSecurityContext(
  overrides: Partial<typeof defaultMockSecurityContext>,
) {
  mockContextValue = { ...defaultMockSecurityContext, ...overrides };
}

export function resetMockSecurityContext() {
  mockContextValue = { ...defaultMockSecurityContext };
}

export function getMockSecurityContext() {
  return mockContextValue;
}

// Sample test data factories
export function createMockScan(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    time: "14:30",
    type: "Quick",
    files: "150",
    threats: 3,
    status: "Completed",
    ...overrides,
  };
}

export function createMockAlert(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    severity: "High" as const,
    time: "2026-03-02 14:30:00",
    type: "Policy Violation",
    description: "Sensitive data detected in document.pdf",
    source: "Scanner",
    status: "New" as const,
    filePath: "/path/to/document.pdf",
    ...overrides,
  };
}

export function createMockPolicy(
  overrides: Record<string, any> = {},
) {
  return {
    id: "1",
    name: "CNIC Detection",
    description: "Detects Pakistani CNIC numbers",
    type: "REGEX",
    pattern: "[0-9]{5}-[0-9]{7}-[0-9]",
    status: "Active" as const,
    ...overrides,
  };
}
