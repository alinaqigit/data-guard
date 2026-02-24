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
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    // visible controls whether we're mounted
    // animating controls which direction we're animating
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            // Small delay so the DOM is mounted before we trigger the enter animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimating(true));
            });
        } else {
            // Trigger exit animation, then unmount after it finishes
            setAnimating(false);
            const timer = setTimeout(() => setVisible(false), 250);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
                backgroundColor: `rgba(0,0,0,${animating ? 0.6 : 0})`,
                backdropFilter: `blur(${animating ? 6 : 0}px)`,
                transition: 'background-color 250ms ease, backdrop-filter 250ms ease',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                    boxShadow: '0 0 50px -12px rgba(0,0,0,0.5)',
                    opacity: animating ? 1 : 0,
                    transform: animating ? 'scale(1)' : 'scale(0.92)',
                    transition: 'opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-6 text-center">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">{message}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-all shadow-lg active:scale-95 text-sm ${isDestructive ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
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