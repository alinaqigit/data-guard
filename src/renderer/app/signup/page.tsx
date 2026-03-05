"use client";

import { useState } from "react";
import { authService } from "@/lib/api";
import { useSecurity } from "@/context/SecurityContext";
import {
  Shield,
  Lock,
  User,
  Mail,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useSecurity();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.register({ username, password });
      // Auto-login after successful registration
      await login(username, password, rememberMe);
      setToast({
        message:
          "Account created successfully! Redirecting to dashboard...",
        type: "success",
      });

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to create account", type: "error" });
    } finally { setIsLoading(false); }
  };

  const inputStyle = {
    width: '100%', background: 'var(--background-input)', border: '1px solid var(--border)',
    borderRadius: '12px', paddingLeft: '44px', paddingRight: '16px',
    paddingTop: '12px', paddingBottom: '12px',
    color: 'var(--text-primary)', fontSize: '14px', fontWeight: 400, outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };
  const iconStyle  = { position: 'absolute' as const, left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', position: 'relative' }}>
              <Image src="/images/logo.png" alt="DataGuard" fill className="object-contain" />
            </div>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>Create Account</h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-disabled)' }}>Join the DataGuard security network</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={iconStyle} />
                <input type="text" required placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={iconStyle} />
                <input type="email" required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={iconStyle} />
                <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            <div className="flex items-center text-sm">
              <label className="flex items-center gap-2 text-neutral-400 cursor-pointer hover:text-neutral-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-800 bg-neutral-950 text-emerald-600 focus:ring-emerald-500"
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-xl tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-on-brand)' }} /> Creating account...</>
                : <>Sign Up <UserPlus size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--surface-1)', textAlign: 'center' }}>
            <Link href="/login" className="inline-flex items-center gap-2 transition-all group"
              style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-disabled)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}