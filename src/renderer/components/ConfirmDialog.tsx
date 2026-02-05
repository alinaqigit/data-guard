import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-black/90 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                    boxShadow: '0 0 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div className="p-6 text-center">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                        {message}
                    </p>
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
