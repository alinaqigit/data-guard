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
    Clock,
    CheckCircle2,
    AlertCircle,
    Eye
} from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';

export default function PolicyManagementPage() {
    const { theme, toggleTheme, policies, deletePolicy, togglePolicyStatus, addPolicy } = useSecurity();
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

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
                    <h1 className="text-3xl font-bold text-white tracking-tight">Policy Management</h1>
                    <p className="text-neutral-500 text-sm mt-1">Configure and enforce security rules across the organization.</p>
                </div>
                <div className="flex items-center gap-4 bg-neutral-900/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-2 rounded-xl">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className="h-6 w-px bg-neutral-800" />
                    <div className="flex items-center gap-2 px-2 text-neutral-400 font-mono text-sm min-w-[100px]">
                        <Clock size={16} />
                        {currentTime}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Active Policies (Main Left Section) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="text-emerald-500" size={24} />
                                Active Policies
                            </h2>
                            <button
                                onClick={handleAddNewPolicy}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
                            >
                                <Plus size={18} />
                                New Policy
                            </button>
                        </div>

                        <div className="divide-y divide-neutral-800">
                            {policies.map((policy: any) => (
                                <div key={policy.id} className="p-6 hover:bg-neutral-800/30 transition-colors group">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors capitalize">
                                                    {policy.name}
                                                </h3>
                                            </div>
                                            <p className="text-neutral-400 text-sm leading-relaxed max-w-xl">
                                                {policy.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 pt-1">
                                                <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded text-[10px] font-mono border border-neutral-700 uppercase tracking-wider">
                                                    Type: {policy.type}
                                                </span>
                                                <span className="text-[10px] text-neutral-500 font-mono">
                                                    ID: {policy.id}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {policy.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-6">
                                        <button className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20">
                                            <Edit2 size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => togglePolicyStatus(policy.id)}
                                            className={`flex items-center gap-1.5 text-xs font-bold transition-colors px-3 py-1.5 rounded-lg border ${policy.status === 'Active'
                                                    ? 'text-red-500 bg-red-500/5 hover:bg-red-500/10 border-red-500/20'
                                                    : 'text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
                                                }`}
                                        >
                                            <Slash size={14} />
                                            {policy.status === 'Active' ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete this policy permanently?')) {
                                                    deletePolicy(policy.id);
                                                }
                                            }}
                                            className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-red-500 transition-all ml-auto p-1.5 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 size={16} />
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
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6">Policy Statistics</h3>

                        <div className="text-center pb-6 border-b border-neutral-800/50 mb-6">
                            <p className="text-5xl font-black text-white mb-1 tracking-tighter">100%</p>
                            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Policy Implementation</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs font-bold uppercase">
                                    <span className="text-neutral-400">Violations Today</span>
                                    <span className="text-rose-500">8</span>
                                </div>
                                <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                                    <div className="h-full w-[35%] bg-rose-500 rounded-full" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs font-bold uppercase">
                                    <span className="text-neutral-400">Policy Coverage</span>
                                    <span className="text-emerald-500">92%</span>
                                </div>
                                <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                                    <div className="h-full w-[92%] bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Quick Actions */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>

                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl transition-all group active:scale-[0.98]">
                                <span className="font-bold text-sm">Import Policy</span>
                                <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
                            </button>

                            <button disabled className="w-full flex items-center justify-between p-4 bg-neutral-950 text-neutral-700 border border-neutral-900 rounded-xl opacity-50 cursor-not-allowed">
                                <span className="font-bold text-sm">Export All</span>
                                <Download size={18} />
                            </button>

                            <button className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-cyan-500/5 text-cyan-500 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl transition-all group active:scale-[0.98]">
                                <span className="font-bold text-sm">Templates</span>
                                <LayoutTemplate size={18} className="group-hover:rotate-12 transition-transform" />
                            </button>

                            <button className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-amber-500/5 text-amber-500 border border-amber-500/30 hover:border-amber-500/60 rounded-xl transition-all group active:scale-[0.98]">
                                <span className="font-bold text-sm">Documentation</span>
                                <BookOpen size={18} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
