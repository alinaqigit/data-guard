import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import {
  createMockSecurityContext,
  createMockScan,
  createMockAlert,
} from "../test-utils";

let mockContextValues = createMockSecurityContext();

jest.mock("@/context/SecurityContext", () => ({
  useSecurity: () => mockContextValues,
}));

jest.mock("@/lib/api/reports.service", () => ({
  reportsService: {
    generateReport: jest.fn().mockResolvedValue({ reportId: 1 }),
    downloadReport: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Dashboard (Home Page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValues = createMockSecurityContext({
      isAuthenticated: true,
    });
  });

  it("redirects to login when not authenticated", () => {
    mockContextValues = createMockSecurityContext({
      isAuthenticated: false,
    });

    const { container } = render(<Home />);

    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(container.innerHTML).toBe("");
  });

  it("renders Security Overview heading", () => {
    render(<Home />);
    expect(screen.getByText("Security Overview")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<Home />);

    expect(screen.getByText("Total Scans")).toBeInTheDocument();
    expect(screen.getByText("Total Threats")).toBeInTheDocument();
    expect(screen.getByText("Files Scanned")).toBeInTheDocument();
    expect(screen.getByText("Active Policies")).toBeInTheDocument();
  });

  it("shows no scans message when scans are empty", () => {
    render(<Home />);
    const noScansMessages = screen.getAllByText("No scans yet");
    expect(noScansMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("shows no threats message when alerts are empty", () => {
    render(<Home />);
    expect(
      screen.getByText("No threats detected"),
    ).toBeInTheDocument();
  });

  it("renders scan data when scans exist", () => {
    mockContextValues = createMockSecurityContext({
      isAuthenticated: true,
      scans: [
        createMockScan({
          id: 1,
          type: "Full",
          threats: 3,
          time: "10:30",
        }),
        createMockScan({
          id: 2,
          type: "Quick",
          threats: 0,
          time: "11:00",
        }),
      ],
    });

    render(<Home />);

    expect(screen.getByText("SCN-0001")).toBeInTheDocument();
    expect(screen.getByText("SCN-0002")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.getByText("Quick")).toBeInTheDocument();
  });

  it("renders alert data when alerts exist", () => {
    mockContextValues = createMockSecurityContext({
      isAuthenticated: true,
      alerts: [
        createMockAlert({
          id: 1234,
          severity: "High",
          type: "SSN Detected",
          time: "2024-01-01 10:30",
        }),
      ],
    });

    render(<Home />);

    expect(screen.getByText("SSN Detected")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("shows correct total values in stat cards", () => {
    mockContextValues = createMockSecurityContext({
      isAuthenticated: true,
      scans: [createMockScan(), createMockScan({ id: 2 })],
      alerts: [createMockAlert(), createMockAlert({ id: 2 })],
      totalFilesScanned: 1500,
      policies: [
        {
          id: "1",
          name: "P1",
          description: "",
          type: "KEYWORD",
          pattern: "test",
          status: "Active" as const,
        },
        {
          id: "2",
          name: "P2",
          description: "",
          type: "REGEX",
          pattern: ".*",
          status: "Disabled" as const,
        },
      ],
    });

    render(<Home />);

    // Total Scans = 2 (may appear multiple times: stat card + alerts count)
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
    // Files Scanned = 1,500
    expect(screen.getByText("1,500")).toBeInTheDocument();
    // Active Policies = 1
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it("renders quick report section with format selector", () => {
    render(<Home />);

    expect(screen.getByText("Quick Report")).toBeInTheDocument();
    expect(screen.getByText("Download Report")).toBeInTheDocument();
    expect(
      screen.getByText("PDF Document (.pdf)"),
    ).toBeInTheDocument();
  });

  it("has View All buttons for scans and threats", () => {
    render(<Home />);

    const viewAllButtons = screen.getAllByText("View All");
    expect(viewAllButtons).toHaveLength(2);
  });
});
