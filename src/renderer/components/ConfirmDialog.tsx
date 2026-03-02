"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen, title, message,
    confirmText = 'Confirm', cancelText = 'Cancel',
    onConfirm, onCancel, isDestructive = false,
}) => {
    const [visible, setVisible]     = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
        } else {
            setAnimating(false);
            const t = setTimeout(() => setVisible(false), 250);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    if (!visible) return null;

    const iconColor  = isDestructive ? 'var(--danger)' : 'var(--brand-light)';
    const iconBg     = isDestructive ? 'var(--danger-a10)' : 'var(--brand-a10)';
    const confirmBg  = isDestructive ? 'var(--danger)' : 'var(--brand-light)';
    const confirmHov = isDestructive ? 'var(--danger-alt)' : 'var(--brand-main)';

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, zIndex: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                backgroundColor: animating ? 'var(--overlay-medium)' : 'transparent',
                backdropFilter: `blur(${animating ? 6 : 0}px)`,
                transition: 'background-color 250ms ease, backdrop-filter 250ms ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--background-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '380px',
                    boxShadow: '0 24px 64px var(--overlay-light)',
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(8px)',
                    transition: 'opacity 250ms cubic-bezier(0.16,1,0.3,1), transform 250ms cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
                    {/* Icon */}
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: iconBg, border: `1px solid ${iconColor}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <AlertTriangle size={22} style={{ color: iconColor }} />
                    </div>

                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        {title}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: '24px' }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '9px 20px', borderRadius: '10px',
                                background: 'var(--background-subtle)', border: '1px solid var(--border)',
                                color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-disabled)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '9px 20px', borderRadius: '10px',
                                background: confirmBg, border: 'none',
                                color: 'var(--text-on-brand)', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = confirmHov)}
                            onMouseLeave={e => (e.currentTarget.style.background = confirmBg)}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;