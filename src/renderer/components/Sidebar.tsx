'use client';

import { useState } from 'react';
import {
    LayoutDashboard, FileSearch, ShieldCheck, Bell,
    ScrollText, BarChart3, ShieldAlert, User, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSecurity } from '@/context/SecurityContext';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    collapsed?: boolean;
    onCollapsedChange?: (v: boolean) => void;
}

const NAV_ITEMS = [
    { name: 'Dashboard',        href: '/',         icon: LayoutDashboard },
    { name: 'Content Scanner',  href: '/scanner',  icon: FileSearch },
    { name: 'Security Monitor', href: '/security', icon: ShieldCheck },
    { name: 'Alerts Center',    href: '/alerts',   icon: Bell },
    { name: 'Policies',         href: '/policies', icon: ScrollText },
    { name: 'Reports',          href: '/reports',  icon: BarChart3 },
    { name: 'Threats',          href: '/threats',  icon: ShieldAlert },
];

const PROFILE_ITEM = { name: 'My Profile', href: '/profile', icon: User };

// Total aside width (includes outer padding)
const EXPANDED_W  = 260;
const COLLAPSED_W = 68;
// Inner card padding (left+right each)
const CARD_PAD = 8;

export default function Sidebar({ isOpen = false, onClose, collapsed = false, onCollapsedChange }: SidebarProps) {
    const pathname = usePathname();
    const { resolvedTheme } = useSecurity();
    const [tooltip, setTooltip] = useState<{ name: string; y: number } | null>(null);

    const NavItem = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
        const isActive = pathname === item.href;

        return (
            <li>
                <Link
                    href={item.href}
                    onClick={onClose}
                    onMouseEnter={e => {
                        if (collapsed) {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ name: item.name, y: r.top + r.height / 2 });
                        }
                        if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'var(--hover-nav)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                        }
                    }}
                    onMouseLeave={e => {
                        setTooltip(null);
                        if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
                        }
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: '10px',
                        width: '100%',
                        height: '36px',
                        padding: collapsed ? '0' : '0 12px',
                        gap: '10px',
                        background: isActive ? 'var(--brand-a15)' : 'transparent',
                        color: isActive ? 'var(--brand-light)' : 'var(--text-tertiary)',
                        fontWeight: isActive ? 600 : 400,
                        // outline keeps the highlight without affecting layout box size
                        outline: isActive ? '1px solid var(--brand-a25)' : '1px solid transparent',
                        outlineOffset: '-1px',
                        fontSize: '13px',
                        textDecoration: 'none',
                        overflow: 'hidden',
                        transition: 'background 0.15s ease, color 0.15s ease, padding 0.3s ease',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <item.icon
                        size={17}
                        style={{ flexShrink: 0, color: isActive ? 'var(--brand-light)' : 'inherit' }}
                    />
                    {!collapsed && <>
                        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.name}
                        </span>
                        {isActive && (
                            <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: 'var(--brand-light)',
                                boxShadow: '0 0 6px var(--brand-a80)',
                                flexShrink: 0,
                            }} />
                        )}
                    </>}
                </Link>
            </li>
        );
    };

    return (
        <>
            <style>{`
                #dg-sidebar {
                    transform: translateX(-100%);
                    transition:
                        width 0.3s cubic-bezier(0.4,0,0.2,1),
                        transform 0.3s cubic-bezier(0.4,0,0.2,1);
                }
                #dg-sidebar.is-open { transform: translateX(0); }
                @media (min-width: 768px) {
                    #dg-sidebar { transform: translateX(0) !important; }
                }
            `}</style>

            {/* Mobile overlay */}
            {isOpen && (
                <div onClick={onClose} style={{
                    position: 'fixed', inset: 0, zIndex: 30,
                    background: 'var(--overlay-light)', backdropFilter: 'blur(4px)',
                }} />
            )}

            {/* Tooltip — rendered at document root level, never clipped */}
            {collapsed && tooltip && (
                <div style={{
                    position: 'fixed',
                    left: COLLAPSED_W + 10,
                    top: tooltip.y,
                    transform: 'translateY(-50%)',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '5px 11px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px var(--shadow-color)',
                }}>
                    <span style={{
                        position: 'absolute',
                        left: -4, top: '50%',
                        transform: 'translateY(-50%) rotate(45deg)',
                        width: 7, height: 7,
                        background: 'var(--surface-1)',
                        borderLeft: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        display: 'block',
                    }} />
                    {tooltip.name}
                </div>
            )}

            {/* Sidebar */}
            <aside
                id="dg-sidebar"
                className={isOpen ? 'is-open' : ''}
                style={{
                    position: 'fixed',
                    left: 0, top: 0,
                    height: '100vh',
                    zIndex: 40,
                    width: collapsed ? COLLAPSED_W : EXPANDED_W,
                    padding: '10px 8px',
                    background: 'transparent',
                    boxSizing: 'border-box',
                }}
            >
                {/* Floating card — fills aside minus the padding */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    background: 'var(--background-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px var(--shadow-color), 0 2px 8px var(--shadow-soft)',
                    overflow: 'hidden',
                }}>

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'space-between',
                        height: '56px',
                        padding: collapsed ? '0' : '0 10px 0 14px',
                        borderBottom: '1px solid var(--surface-1)',
                        flexShrink: 0,
                        gap: '8px',
                        transition: 'padding 0.3s ease',
                        overflow: 'hidden',
                    }}>
                        {/* Logo + wordmark — hidden when collapsed */}
                        {!collapsed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                                <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
                                    <Image src={resolvedTheme === 'light' ? '/images/logo-dark.png' : '/images/logo.png'} alt="DataGuard" fill style={{ objectFit: 'contain' }} />
                                </div>
                                <span style={{
                                    fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                }}>
                                    DataGuard
                                </span>
                            </div>
                        )}

                        {/* Toggle button */}
                        <button
                            onClick={() => onCollapsedChange?.(!collapsed)}
                            style={{
                                flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px',
                                borderRadius: '8px',
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: 'var(--text-disabled)',
                                cursor: 'pointer',
                                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--hover-nav-strong)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-disabled)';
                            }}
                        >
                            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                        </button>
                    </div>

                    {/* Nav */}
                    <nav style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: `10px ${CARD_PAD}px`,
                    }}>
                        <ul style={{
                            listStyle: 'none', margin: 0, padding: 0,
                            display: 'flex', flexDirection: 'column', gap: '2px',
                        }}>
                            {NAV_ITEMS.map(item => <NavItem key={item.href} item={item} />)}
                        </ul>
                    </nav>

                    {/* Bottom: Profile + version */}
                    <div style={{
                        borderTop: '1px solid var(--surface-1)',
                        padding: `8px ${CARD_PAD}px`,
                        flexShrink: 0,
                    }}>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            <NavItem item={PROFILE_ITEM} />
                        </ul>

                        {/* Version string — hidden when collapsed */}
                        <div style={{
                            overflow: 'hidden',
                            maxHeight: collapsed ? 0 : '28px',
                            opacity: collapsed ? 0 : 1,
                            transition: 'max-height 0.3s ease, opacity 0.2s ease',
                        }}>
                            <p style={{
                                fontSize: '11px', color: 'var(--border)',
                                textAlign: 'center', padding: '6px 0 2px',
                                whiteSpace: 'nowrap',
                            }}>
                                v1.0.0 · DataGuard DLP
                            </p>
                        </div>
                    </div>

                </div>
            </aside>
        </>
    );
}