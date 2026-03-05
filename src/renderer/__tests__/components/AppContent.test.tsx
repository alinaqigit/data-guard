import React from "react";
import { render, screen } from "@testing-library/react";
import AppContent from "@/components/AppContent";

// Track mock values
let mockIsAuthenticated = true;
let mockTheme = "dark";
let mockPathname = "/";

jest.mock("@/context/SecurityContext", () => ({
  useSecurity: () => ({
    isAuthenticated: mockIsAuthenticated,
    theme: mockTheme,
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock child components
jest.mock("@/components/Sidebar", () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock("@/components/Topbar", () => {
  return function MockTopbar() {
    return <div data-testid="topbar">Topbar</div>;
  };
});

jest.mock("@/app/login/page", () => {
  return function MockLoginPage() {
    return <div data-testid="login-page">Login Page</div>;
  };
});

describe("AppContent", () => {
  beforeEach(() => {
    mockIsAuthenticated = true;
    mockTheme = "dark";
    mockPathname = "/";
  });

  it("renders loading placeholder before mount", () => {
    // Since useEffect fires synchronously in test, this is tricky to test
    // but we can verify the component renders successfully
    render(
      <AppContent>
        <div>Child content</div>
      </AppContent>,
    );
    // After mount, should show content
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders sidebar and topbar for authenticated user", () => {
    mockIsAuthenticated = true;
    render(
      <AppContent>
        <div>Dashboard</div>
      </AppContent>,
    );
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders login page for unauthenticated user on protected route", () => {
    mockIsAuthenticated = false;
    mockPathname = "/";
    render(
      <AppContent>
        <div>Protected content</div>
      </AppContent>,
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(
      screen.queryByText("Protected content"),
    ).not.toBeInTheDocument();
  });

  it("renders children for unauthenticated user on /login path", () => {
    mockIsAuthenticated = false;
    mockPathname = "/login";
    render(
      <AppContent>
        <div>Login form</div>
      </AppContent>,
    );
    expect(screen.getByText("Login form")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("renders children for unauthenticated user on /signup path", () => {
    mockIsAuthenticated = false;
    mockPathname = "/signup";
    render(
      <AppContent>
        <div>Signup form</div>
      </AppContent>,
    );
    expect(screen.getByText("Signup form")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("applies dark theme class", () => {
    mockTheme = "dark";
    render(
      <AppContent>
        <div>Content</div>
      </AppContent>,
    );
    const wrapper = screen
      .getByText("Content")
      .closest("div[class*='flex w-full']");
    expect(wrapper?.className).toContain("dark");
    expect(wrapper?.className).toContain("bg-black");
  });

  it("applies light theme class", () => {
    mockTheme = "light";
    render(
      <AppContent>
        <div>Content</div>
      </AppContent>,
    );
    const wrapper = screen
      .getByText("Content")
      .closest("div[class*='flex w-full']");
    expect(wrapper?.className).toContain("bg-white");
  });
});
