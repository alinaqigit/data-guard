import React, { useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const isSuccess = type === 'success';

    return (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-top-5 duration-300">
            <div className={`${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`}>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    {isSuccess ? (
                        <Check size={16} strokeWidth={3} />
                    ) : (
                        <AlertCircle size={16} strokeWidth={3} />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="font-black text-lg leading-tight">
                        {isSuccess ? 'Success' : 'Error'}
                    </span>
                    <span className="text-white/90 text-sm font-medium">
                        {message}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
