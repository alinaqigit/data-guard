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

    const iconColor  = isDestructive ? '#F85149' : '#5272C5';
    const iconBg     = isDestructive ? 'rgba(248,81,73,0.1)' : 'rgba(82,114,197,0.1)';
    const confirmBg  = isDestructive ? '#F85149' : '#5272C5';
    const confirmHov = isDestructive ? '#FD5658' : '#445C9A';

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, zIndex: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                backgroundColor: `rgba(0,0,0,${animating ? 0.7 : 0})`,
                backdropFilter: `blur(${animating ? 6 : 0}px)`,
                transition: 'background-color 250ms ease, backdrop-filter 250ms ease',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#12161B',
                    border: '1px solid #30363D',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '380px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
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

                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>
                        {title}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 400, color: '#989898', lineHeight: 1.6, marginBottom: '24px' }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '9px 20px', borderRadius: '10px',
                                background: '#161B22', border: '1px solid #30363D',
                                color: '#989898', fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer', transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#535865'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#989898'; e.currentTarget.style.borderColor = '#30363D'; }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '9px 20px', borderRadius: '10px',
                                background: confirmBg, border: 'none',
                                color: '#FFFFFF', fontSize: '13px', fontWeight: 600,
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