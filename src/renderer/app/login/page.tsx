"use client";

import { useState, useEffect } from "react";
import { useSecurity } from "@/context/SecurityContext";
import { Shield, Lock, User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const { login, isAuthenticated } = useSecurity();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex p-6 mb-4 group transition-all duration-500">
            <div className="w-24 h-24 relative">
              <Image
                src="/images/logo.png"
                alt="DataGuard Logo"
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-3">
            DataGaurd
          </h1>
          <p className="text-neutral-400 font-bold text-lg tracking-wide uppercase opacity-75">
            Data Leak Prevention & Monitoring
          </p>
        </div>

        <div
          className="border border-white/5 rounded-[2.5rem] p-10 shadow-2xl transition-all duration-500"
          style={{
            background:
              "linear-gradient(135deg, #020617 0%, #000000 100%)",
          }}
        >
          <h2 className="text-2xl font-black text-white mb-8 tracking-tight">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">
                Username
              </label>
              <div className="relative group">
                <User
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors"
                  size={20}
                />
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
            <div className="space-y-3">
              <label className="text-sm font-black text-neutral-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition-colors"
                  size={20}
                />
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-neutral-400 cursor-pointer hover:text-neutral-300">
                <input
                  type="checkbox"
                  className="rounded border-neutral-800 bg-neutral-950 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-xl tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Login to DataGaurd
                  <ArrowRight size={22} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-white/5 text-center">
            <p className="text-neutral-500 font-bold text-lg">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-500 hover:text-blue-400 font-black transition-all hover:tracking-tight"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
