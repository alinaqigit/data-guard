"use client";

import { useSecurity } from "@/context/SecurityContext";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TitleBar from "@/components/TitleBar";
import LoginPage from "@/app/login/page";

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useSecurity();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dlp_sidebar_collapsed");
    if (saved === "true") setIsSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("dlp_sidebar_collapsed", String(next));
      return next;
    });
  };

  if (!mounted) {
    return (
      <div
        style={{ minHeight: "100vh", background: "var(--background-body)" }}
        suppressHydrationWarning
      />
    );
  }

  const isPublicPath =
    pathname === "/login" || pathname === "/signup";

  if (!isAuthenticated && !isPublicPath) {
    return (
      <main style={{ flex: 1, width: "100%", minHeight: "100vh", background: "var(--background-body)" }}>
        <LoginPage />
      </main>
    );
  }

  if (!isAuthenticated && isPublicPath) {
    return (
      <main style={{ flex: 1, width: "100%", minHeight: "100vh", background: "var(--background-body)" }}>
        {children}
      </main>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        background: "var(--background-body)",
        color: "var(--text-primary)",
      }}
    >
      {/* TitleBar at the top */}
      <TitleBar />

      {/* Body below titlebar */}
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: "36px",
          padding: "10px",
          gap: "10px",
          overflow: "hidden",
        }}
      >
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "auto",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <main
            style={{
              flex: 1,
              padding: "24px",
              maxWidth: "1280px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
