"use client";

import { useState, useEffect } from "react";
import { useSecurity } from "@/context/SecurityContext";
import { Lock, User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const { login, isAuthenticated } = useSecurity();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { if (isAuthenticated) router.push("/"); }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try { await login(username, password); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed. Please check your credentials."); }
    finally { setIsLoading(false); }
  };

  const inputStyle = {
    width: '100%', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '12px', paddingLeft: '44px', paddingRight: '16px',
    paddingTop: '12px', paddingBottom: '12px',
    color: '#FFFFFF', fontSize: '14px', fontWeight: 400, outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#535865', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000000' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', position: 'relative' }}>
              <Image src="/images/logo.png" alt="DataGuard" fill className="object-contain" />
            </div>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '8px' }}>DataGuard</h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: '#535865', letterSpacing: '0.04em' }}>Data Leak Prevention & Monitoring</p>
        </div>

        {/* Card */}
        <div style={{ background: '#12161B', border: '1px solid #30363D', borderRadius: '20px', padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginBottom: '24px' }}>Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#535865' }} />
                <input type="text" required placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#535865' }} />
                <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#445C9A')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#30363D')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '13px', fontWeight: 400, color: '#989898' }}>
                <input type="checkbox" style={{ accentColor: '#5272C5' }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: '13px', fontWeight: 500, color: '#5272C5', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#BABABA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5272C5')}
              >Forgot Password?</a>
            </div>

            {error && (
              <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#F85149', fontSize: '13px', fontWeight: 400 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: isLoading ? '#3B5189' : '#5272C5', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#445C9A'; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#5272C5'; }}
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> Signing in...</>
                : <>Login to DataGuard <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1A1F28', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 400, color: '#535865' }}>
              Don't have an account?{' '}
              <Link href="/signup" style={{ color: '#5272C5', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#BABABA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5272C5')}
              >Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}