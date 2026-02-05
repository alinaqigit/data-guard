'use client';

import { useState } from 'react';
import { useSecurity } from '@/context/SecurityContext';
import { Shield, Lock, User, Mail, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';


import Toast from '@/components/Toast';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to login or auto-login
        setToast({ message: 'Account created (Mock). Redirecting to login...', type: 'success' });

        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <div className="inline-flex p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-8 group hover:border-emerald-500/40 transition-all duration-500 shadow-2xl shadow-emerald-500/5">
                        <Shield className="text-emerald-500 group-hover:scale-110 transition-transform duration-500" size={64} />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-3">
                        Create Account
                    </h1>
                    <p className="text-neutral-400 font-bold text-lg tracking-wide uppercase opacity-75">Join the security network</p>
                </div>

                <div className="border border-white/5 rounded-[2.5rem] p-10 shadow-2xl transition-all duration-500"
                    style={{
                        background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    }}
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-lg placeholder:text-neutral-700"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-lg placeholder:text-neutral-700"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4.5 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-lg placeholder:text-neutral-700"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-xl tracking-tight"
                        >
                            Sign Up
                            <UserPlus size={22} />
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-white/5 text-center">
                        <Link href="/login" className="inline-flex items-center gap-3 text-neutral-400 hover:text-white transition-all font-black text-lg group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
