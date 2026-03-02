"use client";

import { useState, useEffect } from "react";
import { useSecurity } from "@/context/SecurityContext";
import { Lock, User, ArrowRight, Mail, KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authService } from "@/lib/api";

export default function LoginPage() {
  const { login, isAuthenticated } = useSecurity();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState<"email" | "reset" | "done">("email");
  const [fpEmail, setFpEmail] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  useEffect(() => { if (isAuthenticated) router.push("/"); }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try { await login(username, password, rememberMe); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed. Please check your credentials."); }
    finally { setIsLoading(false); }
  };

  const handleForgotPasswordOpen = () => {
    setShowForgotPassword(true);
    setFpStep("email");
    setFpEmail("");
    setFpNewPassword("");
    setFpConfirmPassword("");
    setFpError("");
  };

  const handleForgotPasswordClose = () => {
    setShowForgotPassword(false);
    setFpError("");
  };

  const handleFpSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");
    if (!fpEmail.trim()) {
      setFpError("Please enter your email address");
      return;
    }
    setFpLoading(true);
    try {
      await authService.verifyEmail(fpEmail);
      setFpStep("reset");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "No account found with that email");
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError("");

    if (!fpNewPassword) {
      setFpError("Please enter a new password");
      return;
    }
    if (fpNewPassword.length < 4) {
      setFpError("Password must be at least 4 characters");
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError("Passwords do not match");
      return;
    }

    setFpLoading(true);
    try {
      await authService.resetPassword(fpEmail, fpNewPassword);
      setFpStep("done");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setFpLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'var(--background-input)', border: '1px solid var(--border)',
    borderRadius: '12px', paddingLeft: '44px', paddingRight: '16px',
    paddingTop: '12px', paddingBottom: '12px',
    color: 'var(--text-primary)', fontSize: '14px', fontWeight: 400, outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' };

  // ── Forgot Password Modal ────────────────────────────────────────────────
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', position: 'relative' }}>
                <Image src="/images/logo.png" alt="DataGuard" fill className="object-contain" />
              </div>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>DataGuard</h1>
            <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-disabled)', letterSpacing: '0.04em' }}>Password Recovery</p>
          </div>

          {/* Card */}
          <div style={{ background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>

            {fpStep === "email" && (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Forgot Password</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-disabled)', marginBottom: '24px' }}>
                  Enter the email address associated with your account.
                </p>
                <form onSubmit={handleFpSubmitEmail} className="space-y-5">
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                      <input
                        type="email" required placeholder="Enter your email"
                        value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  </div>

                  {fpError && (
                    <div style={{ background: 'var(--danger-a10)', border: '1px solid var(--danger-a25)', borderRadius: '10px', padding: '10px 14px', color: 'var(--danger)', fontSize: '13px' }}>
                      {fpError}
                    </div>
                  )}

                  <button type="submit" disabled={fpLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                    style={{ background: fpLoading ? 'var(--brand-mid)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: fpLoading ? 'not-allowed' : 'pointer', opacity: fpLoading ? 0.7 : 1 }}
                    onMouseEnter={e => { if (!fpLoading) e.currentTarget.style.background = 'var(--brand-main)'; }}
                    onMouseLeave={e => { if (!fpLoading) e.currentTarget.style.background = 'var(--brand-light)'; }}
                  >
                    {fpLoading
                      ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-on-brand)' }} /> Verifying...</>
                      : <>Continue <ArrowRight size={16} /></>}
                  </button>
                </form>
              </>
            )}

            {fpStep === "reset" && (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Reset Password</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-disabled)', marginBottom: '24px' }}>
                  Enter a new password for <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{fpEmail}</span>
                </p>
                <form onSubmit={handleFpResetPassword} className="space-y-5">
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                      <input
                        type="password" required placeholder="Enter new password"
                        value={fpNewPassword} onChange={e => setFpNewPassword(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                      <input
                        type="password" required placeholder="Confirm new password"
                        value={fpConfirmPassword} onChange={e => setFpConfirmPassword(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  </div>

                  {fpError && (
                    <div style={{ background: 'var(--danger-a10)', border: '1px solid var(--danger-a25)', borderRadius: '10px', padding: '10px 14px', color: 'var(--danger)', fontSize: '13px' }}>
                      {fpError}
                    </div>
                  )}

                  <button type="submit" disabled={fpLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                    style={{ background: fpLoading ? 'var(--brand-mid)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: fpLoading ? 'not-allowed' : 'pointer', opacity: fpLoading ? 0.7 : 1 }}
                    onMouseEnter={e => { if (!fpLoading) e.currentTarget.style.background = 'var(--brand-main)'; }}
                    onMouseLeave={e => { if (!fpLoading) e.currentTarget.style.background = 'var(--brand-light)'; }}
                  >
                    {fpLoading
                      ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-on-brand)' }} /> Resetting...</>
                      : "Reset Password"}
                  </button>
                </form>
              </>
            )}

            {fpStep === "done" && (
              <div className="text-center py-4">
                <CheckCircle size={48} style={{ color: 'var(--success-alt)', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Password Reset</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-disabled)', marginBottom: '24px' }}>
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
                <button
                  onClick={handleForgotPasswordClose}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                  style={{ background: 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-main)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-light)')}
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              </div>
            )}

            {fpStep !== "done" && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={handleForgotPasswordClose}
                  style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand-light)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-light)')}
                >
                  <span className="inline-flex items-center gap-1"><ArrowLeft size={14} /> Back to Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Login Form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', position: 'relative' }}>
              <Image src="/images/logo.png" alt="DataGuard" fill className="object-contain" />
            </div>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '8px' }}>DataGuard</h1>
          <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-disabled)', letterSpacing: '0.04em' }}>Data Leak Prevention & Monitoring</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                <input type="text" required placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--brand-light)' }} />
                Remember me
              </label>
              <button type="button" onClick={handleForgotPasswordOpen}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brand-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-light)')}
              >Forgot Password?</button>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-a10)', border: '1px solid var(--danger-a25)', borderRadius: '10px', padding: '10px 14px', color: 'var(--danger)', fontSize: '13px', fontWeight: 400 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
              style={{ background: isLoading ? 'var(--brand-mid)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-main)'; }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-light)'; }}
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--spinner-track)', borderTopColor: 'var(--text-on-brand)' }} /> Signing in...</>
                : <>Login to DataGuard <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--surface-1)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-disabled)' }}>
              Don't have an account?{' '}
              <Link href="/signup" style={{ color: 'var(--brand-light)', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-light)')}
              >Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}