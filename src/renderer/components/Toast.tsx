import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        const t = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(t);
    }, []);

    const config = {
        success: { color: '#22C35D', border: 'rgba(34,195,93,0.25)',  Icon: CheckCircle2,  label: 'Success' },
        error:   { color: '#F85149', border: 'rgba(248,81,73,0.25)',  Icon: XCircle,       label: 'Error'   },
        warning: { color: '#F8C149', border: 'rgba(248,193,73,0.25)', Icon: AlertTriangle, label: 'Alert'   },
    }[type];

    return (
        <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: '#12161B',
                border: `1px solid ${config.border}`,
                borderLeft: `3px solid ${config.color}`,
                borderRadius: '12px',
                padding: '14px 16px',
                minWidth: '280px', maxWidth: '360px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                <config.Icon size={18} style={{ color: config.color, flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '2px' }}>
                        {config.label}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: 400, color: '#989898', lineHeight: 1.5 }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        flexShrink: 0, background: 'transparent', border: 'none',
                        color: '#535865', cursor: 'pointer', padding: '2px',
                        borderRadius: '4px', transition: 'color 0.15s',
                        display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#535865')}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default Toast;