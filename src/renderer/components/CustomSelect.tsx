"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

interface Option {
    value: string;
    label: string;
    description?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
}

export default function CustomSelect({
    value, onChange, options,
    placeholder = "Select...", className = "",
}: CustomSelectProps) {
    const [open, setOpen]                     = useState(false);
    const [dropdownStyle, setDropdownStyle]   = useState<React.CSSProperties>({});
    const triggerRef  = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    const updatePosition = () => {
        if (!triggerRef.current) return;
        const rect           = triggerRef.current.getBoundingClientRect();
        const spaceBelow     = window.innerHeight - rect.bottom;
        const dropdownHeight = Math.min(options.length * 56 + 8, 280);
        const openUpward     = spaceBelow < dropdownHeight && rect.top > spaceBelow;
        setDropdownStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
            ...(openUpward ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
        });
    };

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node) || dropdownRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, []);

    useEffect(() => {
        if (!open) return;
        const reposition = () => updatePosition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
    }, [open]);

    const dropdown = open ? (
        <div
            ref={dropdownRef}
            style={{
                ...dropdownStyle,
                background: 'var(--background-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px var(--shadow-color)',
                overflow: 'hidden',
            }}
        >
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                {options.map(option => {
                    const isSelected = option.value === value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); onChange(option.value); setOpen(false); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', gap: '12px',
                                padding: '10px 12px', textAlign: 'left',
                                borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: isSelected ? 'var(--brand-a12)' : 'transparent',
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                transition: 'background 0.12s ease, color 0.12s ease',
                            }}
                            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'var(--background-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                        >
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400, margin: 0 }}>
                                    {option.label}
                                </p>
                                {option.description && (
                                    <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                                        {option.description}
                                    </p>
                                )}
                            </div>
                            {isSelected && <Check size={14} style={{ color: 'var(--brand-light)', flexShrink: 0 }} />}
                        </button>
                    );
                })}
            </div>
        </div>
    ) : null;

    return (
        <div style={{ position: 'relative' }} className={className}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => open ? setOpen(false) : (updatePosition(), setOpen(true))}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '8px',
                    padding: '9px 12px', borderRadius: '10px',
                    background: 'var(--background-input)',
                    border: `1px solid ${open ? 'var(--brand-main)' : 'var(--border)'}`,
                    color: selected ? 'var(--text-primary)' : 'var(--text-disabled)',
                    fontSize: '13px', fontWeight: 400,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s ease',
                    outline: open ? '3px solid var(--brand-a12)' : 'none',
                    outlineOffset: '0px',
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--text-disabled)'; }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
                <span>{selected ? selected.label : placeholder}</span>
                <ChevronDown
                    size={15}
                    style={{
                        color: open ? 'var(--brand-light)' : 'var(--text-disabled)',
                        flexShrink: 0,
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease, color 0.15s ease',
                    }}
                />
            </button>
            {typeof window !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
        </div>
    );
}