'use client';

import { useState, useEffect } from 'react';
import {
    Shield,
    Plus,
    Edit2,
    Slash,
    Trash2,
    Upload,
    Download,
    BookOpen,
    LayoutTemplate,
    Moon,
    Sun,
    CheckCircle2,
    AlertCircle,
    Eye
} from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';

export default function PolicyManagementPage() {
    const { theme, toggleTheme, policies, deletePolicy, togglePolicyStatus, addPolicy } = useSecurity();

    const handleAddNewPolicy = () => {
        addPolicy({
            name: 'New Security Policy',
            description: 'New policy created to monitor sensitive data flows.',
            type: 'SENSITIVE_DATA',
            status: 'Active'
        });
    };

    return (
        <div className="space-y-6 pb-12">
            {/* 1. Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 tracking-tight">
                        Policy Management
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Active Policies (Main Left Section) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="border rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                                <Shield className="text-emerald-500" size={28} />
                                Active Policies
                            </h2>
                            <button
                                onClick={handleAddNewPolicy}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-base font-black transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
                            >
                                <Plus size={20} />
                                New Policy
                            </button>
                        </div>

                        <div className="divide-y divide-white/5">
                            {policies.map((policy: any) => (
                                <div key={policy.id} className="p-6 hover:bg-white/5 transition-colors group">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors capitalize tracking-tight">
                                                    {policy.name}
                                                </h3>
                                            </div>
                                            <p className="text-neutral-400 text-base font-bold leading-relaxed max-w-xl">
                                                {policy.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-5 pt-1">
                                                <span className="bg-white/5 text-neutral-300 px-3 py-1 rounded text-sm font-black border border-white/10 uppercase tracking-widest">
                                                    Type: {policy.type}
                                                </span>
                                                <span className="text-sm text-neutral-500 font-black tracking-widest">
                                                    ID: {policy.id}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-sm font-black uppercase border border-emerald-500/20 flex items-center gap-2 shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                {policy.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-5 mt-8">
                                        <button className="flex items-center gap-2 text-base font-black text-blue-500 hover:text-blue-400 transition-colors px-4 py-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20">
                                            <Edit2 size={18} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => togglePolicyStatus(policy.id)}
                                            className={`flex items-center gap-2 text-base font-black transition-colors px-4 py-2 rounded-xl border ${policy.status === 'Active'
                                                ? 'text-red-500 bg-red-500/5 hover:bg-red-500/10 border-red-500/20'
                                                : 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
                                                }`}
                                        >
                                            <Slash size={18} />
                                            {policy.status === 'Active' ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this policy permanently?')) {
                                                    deletePolicy(policy.id);
                                                }
                                            }}
                                            className="flex items-center gap-2 text-base font-black text-neutral-500 hover:text-red-500 transition-all ml-auto p-2 hover:bg-red-500/10 rounded-xl"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* 3. Policy Statistics */}
                    <div className="border rounded-2xl p-6 shadow-xl transition-all duration-300"
                        style={{
                            background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                            borderColor: 'rgba(51, 65, 85, 0.3)'
                        }}>
                        <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Policy Statistics</h3>

                        <div className="text-center pb-8 border-b border-white/5 mb-8">
                            <p className="text-6xl font-black text-white mb-2 tracking-tighter">100%</p>
                            <p className="text-neutral-500 text-sm font-black uppercase tracking-[0.2em]">Policy Implementation</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-base font-black uppercase tracking-wider">
                                    <span className="text-neutral-400">Violations Today</span>
                                    <span className="text-rose-500">8</span>
                                </div>
                                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                                    <div className="h-full w-[35%] bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-base font-black uppercase tracking-wider">
                                    <span className="text-neutral-400">Policy Coverage</span>
                                    <span className="text-emerald-500">92%</span>
                                </div>
                                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                                    <div className="h-full w-[92%] bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
