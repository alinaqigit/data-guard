'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Edit2, Save, X, LogOut } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, logout, updateUserProfile } = useSecurity();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const initialUser = user || { name: 'Loading...', email: '', role: 'Administrator', bio: '' };
    const [formData, setFormData] = useState(initialUser);
    useEffect(() => { if (user) setFormData(user); }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile(formData);
        setIsEditing(false);
    };

    const displayUser = user || initialUser;
    const cardStyle = { background: '#12161B', border: '1px solid #30363D', borderRadius: '16px', padding: '24px' };
    const inputStyle = {
        width: '100%', background: '#0D1117', border: '1px solid #30363D',
        borderRadius: '10px', padding: '10px 14px', color: '#FFFFFF',
        fontSize: '14px', fontWeight: 400, outline: 'none',
    };
    const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#535865', textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '6px' };

    return (
        <div className="space-y-6 max-w-3xl mx-auto py-6 pb-12">
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', textAlign: 'center' }}>
                My Profile
            </h1>

            <div className="flex flex-col gap-6">
                {/* Avatar card */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div style={{
                        width: '96px', height: '96px', borderRadius: '50%',
                        background: '#161B22', border: '2px solid #30363D',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '36px', fontWeight: 700, color: '#535865' }}>
                            {displayUser.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>{displayUser.name}</h2>
                        <p style={{ fontSize: '14px', fontWeight: 400, color: '#989898', marginTop: '4px' }}>{displayUser.email}</p>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(82,114,197,0.1)', border: '1px solid rgba(82,114,197,0.2)',
                        borderRadius: '99px', padding: '4px 12px',
                    }}>
                        <Shield size={13} style={{ color: '#5272C5' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#5272C5' }}>{displayUser.role}</span>
                    </div>

                    <button onClick={() => setIsEditing(!isEditing)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all"
                        style={{ background: '#161B22', border: '1px solid #30363D', color: '#BABABA', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#445C9A')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363D')}
                    >
                        {isEditing ? <><X size={15} /> Cancel Editing</> : <><Edit2 size={15} /> Edit Profile</>}
                    </button>

                    <button onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all"
                        style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', color: '#F85149', fontSize: '13px', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.08)')}
                    >
                        <LogOut size={15} /> Logout
                    </button>
                </div>

                {/* Bio */}
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>About</h3>
                    <p style={{ fontSize: '14px', fontWeight: 400, color: '#989898', lineHeight: 1.6 }}>{displayUser.bio || 'No bio set.'}</p>
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
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '16px' }}>Edit Information</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label style={labelStyle}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#535865' }} />
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                                        style={{ ...inputStyle, paddingLeft: '36px' }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#535865' }} />
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
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
                                style={{ background: '#5272C5', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#445C9A')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#5272C5')}
                            >
                                <Save size={15} /> Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Logout modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setShowLogoutConfirm(false)} />
                    <div style={{ ...cardStyle, position: 'relative', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'rgba(248,81,73,0.1)', borderRadius: '50%' }}>
                                <LogOut size={24} style={{ color: '#F85149' }} />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>Confirm Logout</h3>
                            <p style={{ fontSize: '13px', fontWeight: 400, color: '#989898', lineHeight: 1.5 }}>
                                Are you sure you want to log out? Your current session will be ended.
                            </p>
                            <div className="flex gap-3 w-full pt-2">
                                <button onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl transition-all"
                                    style={{ background: '#161B22', border: '1px solid #30363D', color: '#989898', fontSize: '13px', fontWeight: 500 }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#989898')}
                                >Cancel</button>
                                <button onClick={() => { logout(); router.push('/login'); }}
                                    className="flex-1 py-2.5 rounded-xl transition-all"
                                    style={{ background: '#F85149', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#FD5658')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '#F85149')}
                                >Log Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}