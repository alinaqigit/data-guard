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
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6 group hover:border-blue-500/40 transition-colors">
                        <Shield className="text-blue-500 group-hover:scale-110 transition-transform" size={48} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                        DLP Dashboard
                    </h1>
                    <p className="text-neutral-500 font-medium">Data Leak Prevention & Monitoring</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-6">Sign In</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400 ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-all outline-none"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-neutral-400 cursor-pointer hover:text-neutral-300">
                                <input type="checkbox" className="rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500" />
                                Remember me
                            </label>
                            <a href="#" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">Forgot Password?</a>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                        >
                            Login to Dashboard
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-neutral-800 text-center">
                        <p className="text-neutral-500">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-blue-500 hover:text-blue-400 font-bold transition-colors">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
