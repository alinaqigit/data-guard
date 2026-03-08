"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  ShieldCheck,
  Bell,
  ScrollText,
  BarChart3,
  ShieldAlert,
  User,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSecurity } from "@/context/SecurityContext";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useSecurity();
  const logoSrc = resolvedTheme === "light" ? "/images/logo-dark.png" : "/images/logo.png";

  const [tooltip, setTooltip] = useState<{ name: string; top: number } | null>(null);

  const showTooltip = (e: React.MouseEvent<HTMLElement>, name: string) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({ name, top: rect.top + rect.height / 2 });
    }
  };

  const hideTooltip = () => setTooltip(null);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Content Scanner", href: "/scanner", icon: FileSearch },
    { name: "Security Monitor", href: "/security", icon: ShieldCheck },
    { name: "Alerts Center", href: "/alerts", icon: Bell },
    { name: "Policies", href: "/policies", icon: ScrollText },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Threats", href: "/threats", icon: ShieldAlert },
  ];

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: isCollapsed ? "10px 0" : "10px 14px",
    borderRadius: "10px",
    textDecoration: "none",
    transition: "all 0.15s ease",
    justifyContent: isCollapsed ? "center" : "flex-start",
    background: isActive ? "var(--brand-a12)" : "transparent",
    color: isActive ? "var(--brand-light)" : "var(--text-tertiary)",
  });

  const handleHover = (
    e: React.MouseEvent<HTMLAnchorElement>,
    enter: boolean,
    isActive: boolean,
  ) => {
    if (isActive) return;
    e.currentTarget.style.background = enter ? "var(--hover-nav)" : "transparent";
    e.currentTarget.style.color = enter ? "var(--text-primary)" : "var(--text-tertiary)";
  };

  return (
    <aside
      style={{
        width: isCollapsed ? "64px" : "240px",
        background: "var(--background-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        zIndex: 100,
        boxShadow: "0 4px 24px var(--shadow-soft)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isCollapsed ? "16px 0" : "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          borderBottom: "1px solid var(--border)",
          minHeight: "56px",
          gap: "8px",
          WebkitAppRegion: "drag" as unknown as string,
        } as React.CSSProperties}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div style={{ width: "28px", height: "28px", position: "relative", flexShrink: 0 }}>
              <Image src={logoSrc} alt="DataGuard Logo" fill className="object-contain" />
            </div>
            <span
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              DataGuard
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          style={{
            padding: "6px",
            borderRadius: "6px",
            background: "transparent",
            border: "none",
            color: "var(--text-disabled)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "color 0.2s ease",
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-disabled)"; }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  style={linkStyle(isActive)}
                  onMouseEnter={(e) => { handleHover(e, true, isActive); showTooltip(e, item.name); }}
                  onMouseLeave={(e) => { handleHover(e, false, isActive); hideTooltip(); }}
                >
                  <item.icon size={20} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: isActive ? 600 : 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {item.name}
                    </span>
                  )}
                  {isActive && !isCollapsed && (
                    <div
                      style={{
                        marginLeft: "auto",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--brand-light)",
                        boxShadow: "0 0 8px var(--brand-a50)",
                      }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — My Profile + Version */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 8px" }}>
        <Link
          href="/profile"
          style={linkStyle(pathname === "/profile")}
          onMouseEnter={(e) => { handleHover(e, true, pathname === "/profile"); showTooltip(e, "My Profile"); }}
          onMouseLeave={(e) => { handleHover(e, false, pathname === "/profile"); hideTooltip(); }}
        >
          <User size={20} style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: pathname === "/profile" ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              My Profile
            </span>
          )}
        </Link>

        {!isCollapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 14px 4px",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--background-subtle)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Image
                src={logoSrc}
                alt=""
                width={14}
                height={14}
                style={{ objectFit: "contain" }}
              />
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-disabled)", whiteSpace: "nowrap" }}>
              v1.0.0 · DataGuard DLP
            </span>
          </div>
        )}
      </div>

      {/* Tooltip for collapsed state */}
      {isCollapsed && tooltip && (
        <div
          style={{
            position: 'fixed',
            left: '76px',
            top: `${tooltip.top}px`,
            transform: 'translateY(-50%)',
            background: 'var(--background-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '5px 12px',
            fontSize: '12.5px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 4px 12px var(--shadow-soft)',
            pointerEvents: 'none',
          }}
        >
          {tooltip.name}
        </div>
      )}
    </aside>
  );
}
