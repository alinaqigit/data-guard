'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Edit2, Save, X, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, logout, updateUserProfile, theme, setThemePreference } = useSecurity();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const initialUser = user || { name: 'Loading...', email: '', role: 'Administrator', bio: '' };
    const [formData, setFormData] = useState(initialUser);
    useEffect(() => { if (user) setFormData(user); }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateUserProfile(formData);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const displayUser = user || initialUser;
    const cardStyle = { background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' };
    const inputStyle = {
        width: '100%', background: 'var(--background-input)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)',
        fontSize: '14px', fontWeight: 400, outline: 'none',
    };
    const labelStyle = { fontSize: '11px', fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '6px' };

    return (
        <div className="space-y-6 max-w-3xl mx-auto py-6 pb-12">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
                My Profile
            </h1>

            <div className="flex flex-col gap-6">
                {/* Avatar card */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div style={{
                        width: '96px', height: '96px', borderRadius: '50%',
                        background: 'var(--background-subtle)', border: '2px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text-disabled)' }}>
                            {displayUser.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{displayUser.name}</h2>
                        <p style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-tertiary)', marginTop: '4px' }}>{displayUser.email}</p>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--brand-a10)', border: '1px solid var(--brand-a20)',
                        borderRadius: '99px', padding: '4px 12px',
                    }}>
                        <Shield size={13} style={{ color: 'var(--brand-light)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand-light)' }}>{displayUser.role}</span>
                    </div>

                    <button onClick={() => setIsEditing(!isEditing)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all"
                        style={{ background: 'var(--background-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-main)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                        {isEditing ? <><X size={15} /> Cancel Editing</> : <><Edit2 size={15} /> Edit Profile</>}
                    </button>

                    <button onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all"
                        style={{ background: 'var(--danger-a08)', border: '1px solid var(--danger-a20)', color: 'var(--danger)', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-a15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--danger-a08)')}
                    >
                        <LogOut size={15} /> Logout
                    </button>
                </div>

                {/* Bio */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>About</h3>
                    <p style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{displayUser.bio || 'No bio set.'}</p>
                </div>

                {/* Theme selector */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Appearance</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {([
                            { value: 'light' as const, label: 'Light', icon: <Sun size={16} /> },
                            { value: 'dark' as const, label: 'Dark', icon: <Moon size={16} /> },
                            { value: 'system' as const, label: 'System', icon: <Monitor size={16} /> },
                        ]).map(opt => {
                            const active = theme === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => setThemePreference(opt.value)}
                                    style={{
                                        flex: 1,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                        padding: '14px 8px', borderRadius: '12px',
                                        background: active ? 'var(--brand-a12)' : 'var(--background-subtle)',
                                        border: `1px solid ${active ? 'var(--brand-a25)' : 'var(--border)'}`,
                                        color: active ? 'var(--brand-light)' : 'var(--text-tertiary)',
                                        fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            e.currentTarget.style.borderColor = 'var(--brand-main)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.color = 'var(--text-tertiary)';
                                        }
                                    }}
                                >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Edit form */}
                <div style={{
                    ...cardStyle,
                    maxHeight: isEditing ? '600px' : '0',
                    opacity: isEditing ? 1 : 0,
                    overflow: 'hidden',
                    padding: isEditing ? '24px' : '0 24px',
                    transition: 'max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease',
                }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Edit Information</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                                        style={{ ...inputStyle, paddingLeft: '36px' }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                                        style={{ ...inputStyle, paddingLeft: '36px' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Bio</label>
                            <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows={4}
                                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
                                style={{ background: isSaving ? 'var(--brand-mid)' : 'var(--brand-light)', color: 'var(--text-on-brand)', fontSize: '13px', fontWeight: 600, opacity: isSaving ? 0.7 : 1 }}
                                onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'var(--brand-main)'; }}
                                onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'var(--brand-light)'; }}
                            >
                                <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Logout modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0" style={{ background: 'var(--overlay-heavy)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setShowLogoutConfirm(false)} />
                    <div style={{ ...cardStyle, position: 'relative', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'var(--danger-a10)', borderRadius: '50%' }}>
                                <LogOut size={24} style={{ color: 'var(--danger)' }} />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Logout</h3>
                            <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                                Are you sure you want to log out? Your current session will be ended.
                            </p>
                            <div className="flex gap-3 w-full pt-2">
                                <button onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl transition-all"
                                    style={{ background: 'var(--background-subtle)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                                >Cancel</button>
                                <button onClick={() => { logout(); router.push('/login'); }}
                                    className="flex-1 py-2.5 rounded-xl transition-all"
                                    style={{ background: 'var(--danger)', color: 'var(--text-on-brand)', fontSize: '13px', fontWeight: 600 }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-alt)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--danger)')}
                                >Log Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}