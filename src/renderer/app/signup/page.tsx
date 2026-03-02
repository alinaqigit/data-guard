"use client";

import { useState } from "react";
import { authService } from "@/lib/api";
import { Lock, User, Mail, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.register({ username, password });
      setToast({ message: "Account created! Redirecting...", type: "success" });
      setTimeout(() => router.push("/"), 2000);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Failed to create account", type: "error" });
    } finally { setIsLoading(false); }
  };

  const inputStyle = {
    width: '100%', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '12px', paddingLeft: '44px', paddingRight: '16px',
    paddingTop: '12px', paddingBottom: '12px',
    color: '#FFFFFF', fontSize: '14px', fontWeight: 400, outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#535865', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };
  const iconStyle  = { position: 'absolute' as const, left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#535865' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000000' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', position: 'relative' }}>
              <Image src="/images/logo.png" alt="DataGuard" fill className="object-contain" />
            </div>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '8px' }}>Create Account</h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: '#535865' }}>Join the DataGuard security network</p>
        </div>

        {/* Card */}
        <div style={{ background: '#12161B', border: '1px solid #30363D', borderRadius: '20px', padding: '32px' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={iconStyle} />
                <input type="text" required placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={iconStyle} />
                <input type="email" required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={iconStyle} />
                <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: isLoading ? '#28A745' : '#22C35D', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#28A745'; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#22C35D'; }}
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Creating account...</>
                : <>Sign Up <UserPlus size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1A1F28', textAlign: 'center' }}>
            <Link href="/login" className="inline-flex items-center gap-2 transition-all group"
              style={{ fontSize: '13px', fontWeight: 500, color: '#535865', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#535865')}
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}