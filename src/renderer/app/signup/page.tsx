'use client';

import { useState } from 'react';
import { useSecurity } from '@/context/SecurityContext';
import { Shield, Lock, User, Mail, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to login or auto-login
        alert('Account created (Mock). You can now login.');
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <Shield className="text-emerald-500" size={48} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                        Create Account
                    </h1>
                    <p className="text-neutral-500 font-medium">Join the security network</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400 ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                        >
                            Sign Up
                            <UserPlus size={18} />
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-neutral-800 text-center">
                        <Link href="/login" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors font-medium">
                            <ArrowLeft size={16} />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
