import React, { useState, useEffect } from 'react';
import { X, Save, Shield } from 'lucide-react';

interface Policy {
    id: number;
    name: string;
    pattern: string;
    type: 'keyword' | 'regex';
    description: string;
    isEnabled: boolean;
}

interface PolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    policy: Policy | null;
    onSave: (policy: Policy) => void;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, policy, onSave }) => {
    const [formData, setFormData] = useState<Policy | null>(null);

    useEffect(() => {
        if (policy) {
            setFormData({ ...policy });
        }
    }, [policy]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-black/90 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                    boxShadow: '0 0 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-indigo-500" size={24} />
                        Edit Policy
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Policy Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-400">Pattern</label>
                        <input
                            type="text"
                            name="pattern"
                            value={formData.pattern}
                            onChange={handleChange}
                            required
                            placeholder={formData.type === 'regex' ? 'e.g. \\d{3}-\\d{2}-\\d{4}' : 'e.g. CONFIDENTIAL'}
                            className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="keyword">Keyword</option>
                                <option value="regex">Regex</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <input
                                type="checkbox"
                                name="isEnabled"
                                id="isEnabled"
                                checked={formData.isEnabled}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-white/10 bg-black/50 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isEnabled" className="text-sm font-medium text-neutral-400">Policy Enabled</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PolicyModal;
