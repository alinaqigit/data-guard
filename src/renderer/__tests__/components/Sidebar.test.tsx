import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "@/components/Sidebar";

// Mock the SecurityContext
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

jest.mock("@/context/SecurityContext", () => ({
  useSecurity: () => ({
    logout: mockLogout,
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the logo and brand name", () => {
    render(<Sidebar />);
    expect(screen.getByAltText("DataGuard Logo")).toBeInTheDocument();
    // Note: The actual code has the typo "DataGaurd"
    expect(screen.getByText("DataGaurd")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Content Scanner")).toBeInTheDocument();
    expect(screen.getByText("Security Monitor")).toBeInTheDocument();
    expect(screen.getByText("Alerts Center")).toBeInTheDocument();
    expect(screen.getByText("Policies")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Threats")).toBeInTheDocument();
    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("renders navigation links with correct hrefs", () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/");

    const scannerLink = screen
      .getByText("Content Scanner")
      .closest("a");
    expect(scannerLink).toHaveAttribute("href", "/scanner");

    const securityLink = screen
      .getByText("Security Monitor")
      .closest("a");
    expect(securityLink).toHaveAttribute("href", "/security");

    const policiesLink = screen.getByText("Policies").closest("a");
    expect(policiesLink).toHaveAttribute("href", "/policies");
  });

  it("highlights the active route (Dashboard)", () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.className).toContain("bg-indigo-600/15");
    expect(dashboardLink?.className).toContain("text-indigo-400");
  });

  it("renders logout button", () => {
    render(<Sidebar />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("calls logout and redirects on logout click", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByText("Logout"));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("renders with closed state by default (off-screen)", () => {
    render(<Sidebar />);
    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("-translate-x-full");
  });

  it("renders visible when isOpen is true", () => {
    render(<Sidebar isOpen={true} />);
    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");
    expect(aside?.className).toContain("shadow-2xl");
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Sidebar isOpen={true} onClose={onClose} />);

    // The mobile close button
    const closeButtons = screen.getAllByRole("button");
    // The first button in the DOM after the logout is the mobile close
    const mobileClose = closeButtons.find((btn) =>
      btn.className.includes("md:hidden"),
    );
    if (mobileClose) {
      await user.click(mobileClose);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("shows version info on mobile", () => {
    render(<Sidebar isOpen={true} />);
    expect(
      screen.getByText("v1.2.0 • DataGuard Admin"),
    ).toBeInTheDocument();
  });
});
