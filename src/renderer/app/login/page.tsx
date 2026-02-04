'use client';

import { useState, useEffect } from 'react';
import { useSecurity } from '@/context/SecurityContext';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const { login, isAuthenticated } = useSecurity();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(username, password);
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <div className="inline-flex p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-8 group hover:border-blue-500/40 transition-all duration-500 shadow-2xl shadow-blue-500/5">
                        <Shield className="text-blue-500 group-hover:scale-110 transition-transform duration-500" size={64} />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-3">
                        DLP Dashboard
                    </h1>
                    <p className="text-neutral-400 font-bold text-lg tracking-wide uppercase opacity-75">Data Leak Prevention & Monitoring</p>
                </div>

                <div className="border border-white/5 rounded-[2.5rem] p-10 shadow-2xl transition-all duration-500"
                    style={{
                        background: 'linear-gradient(135deg, #020617 0%, #000000 100%)',
                    }}
                >
                    <h2 className="text-2xl font-black text-white mb-8 tracking-tight">Sign In</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-lg placeholder:text-neutral-700"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        破
                        <div className="space-y-3">
                            <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-lg placeholder:text-neutral-700"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        破
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-neutral-400 cursor-pointer hover:text-neutral-300">
                                <input type="checkbox" className="rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500" />
                                Remember me
                            </label>
                            <a href="#" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">Forgot Password?</a>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-xl tracking-tight"
                        >
                            Login to Dashboard
                            <ArrowRight size={22} />
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-white/5 text-center">
                        <p className="text-neutral-500 font-bold text-lg">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-blue-500 hover:text-blue-400 font-black transition-all hover:tracking-tight">
                                Create Account
                            </Link>
                        </p>
                    </div>
                    破                </div>
            </div>
        </div>
    );
}
