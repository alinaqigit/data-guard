'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Scan {
    id: number;
    time: string;
    type: string;
    files: string;
    threats: number;
    status: string;
}

interface Alert {
    id: number;
    severity: 'High' | 'Medium' | 'Low';
    time: string;
    type: string;
    description: string;
    source: string;
    status: 'New' | 'Resolved' | 'Quarantined' | 'Investigating';
}

interface UserProfile {
    name: string;
    email: string;
    role: string;
    bio: string;
}

interface Policy {
    id: number;
    name: string;
    pattern: string;
    type: 'keyword' | 'regex';
    description: string;
    isEnabled: boolean;
}

interface SecurityContextType {
    scans: Scan[];
    alerts: Alert[];
    policies: Policy[];
    totalFilesScanned: number;
    isAuthenticated: boolean;
    user: UserProfile | null;
    runScan: (type: string, target: string, path: string) => void;
    resolveAlert: (id: number) => void;
    clearAllAlerts: () => void;
    clearAllScans: () => void;
    deleteAlert: (id: number) => void;
    login: (username: string, pass: string) => Promise<void>;
    signup: (username: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUserProfile: (profile: UserProfile) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    addPolicy: (policy: Omit<Policy, 'id' | 'isEnabled'>) => Promise<void>;
    updatePolicy: (policy: Policy) => Promise<void>;
    togglePolicyStatus: (id: number) => Promise<void>;
    deletePolicy: (id: number) => Promise<void>;
    fetchPolicies: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [scans, setScans] = useState<Scan[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [totalFilesScanned, setTotalFilesScanned] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [policies, setPolicies] = useState<Policy[]>([]);

    // Policies fetcher
    const fetchPolicies = async () => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (!sessionId) return;

        try {
            const response = await fetch('http://localhost:4000/api/policies', {
                headers: { 'x-session-id': sessionId }
            });
            if (response.ok) {
                const data = await response.json();
                setPolicies(data);
            }
        } catch (error) {
            console.error('Failed to fetch policies:', error);
        }
    };

    useEffect(() => {
        const savedPolicies = localStorage.getItem('dlp_policies');
        const savedTheme = localStorage.getItem('dlp_theme') as 'light' | 'dark';

        if (savedPolicies) setPolicies(JSON.parse(savedPolicies));
        if (savedTheme) setTheme(savedTheme);

        // Verify session with backend
        const verifySession = async () => {
            const sessionId = localStorage.getItem('dlp_session_id');
            if (sessionId) {
                try {
                    const response = await fetch('http://localhost:4000/api/auth/verify', {
                        headers: { 'x-session-id': sessionId }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setIsAuthenticated(true);
                        setUser({
                            name: userData.username,
                            email: `${userData.username.toLowerCase()}@example.com`,
                            role: 'Security Administrator',
                            bio: 'Authenticated user.'
                        });
                        // Fetch policies after successful authentication verification
                        await fetchPolicies();
                    } else {
                        // Session invalid, clear up
                        localStorage.removeItem('dlp_session_id');
                        setIsAuthenticated(false);
                        setUser(null);
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                    setIsAuthenticated(false);
                    setUser(null);
                }
            }
        };

        verifySession();
    }, []);

    // Sync theme to localStorage
    useEffect(() => {
        localStorage.setItem('dlp_theme', theme);
    }, [theme]);

    // Sync policies to localStorage
    useEffect(() => {
        localStorage.setItem('dlp_policies', JSON.stringify(policies));
    }, [policies]);

    const runScan = (type: string, target: string, path: string) => {
        const fileCount = Math.floor(Math.random() * 500) + 50;
        const threatCount = Math.floor(Math.random() * 3);
        const scanTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newScan: Scan = {
            id: Date.now(),
            time: scanTime,
            type: type.replace(' (Fast)', ''),
            files: fileCount.toLocaleString(),
            threats: threatCount,
            status: 'Completed'
        };

        setScans(prev => [newScan, ...prev]);
        setTotalFilesScanned(prev => prev + fileCount);

        // Generate alerts if threats found
        if (threatCount > 0) {
            const statuses: ('New' | 'Quarantined' | 'Investigating')[] = ['New', 'Quarantined', 'Investigating'];
            const newAlerts: Alert[] = Array.from({ length: threatCount }).map((_, i) => ({
                id: Date.now() + i,
                severity: threatCount > 1 ? 'High' : 'Medium',
                time: new Date().toISOString().replace('T', ' ').split('.')[0],
                type: 'Policy Violation: Sensitive Content',
                description: `Potential data leak detected in ${path || 'target location'} during ${type}.`,
                source: type,
                status: statuses[Math.floor(Math.random() * statuses.length)]
            }));
            setAlerts(prev => [...newAlerts, ...prev]);
        }
    };

    const resolveAlert = (id: number) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved' } : a));
    };

    const deleteAlert = (id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const clearAllAlerts = () => setAlerts([]);
    const clearAllScans = () => setScans([]);

    const login = async (u: string, p: string) => {
        try {
            const response = await fetch('http://localhost:4000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p }),
            });

            const data = await response.json();

            if (response.ok) {
                const newUser: UserProfile = {
                    name: data.user.username,
                    email: `${data.user.username.toLowerCase()}@example.com`,
                    role: 'Security Administrator',
                    bio: 'Dashboard administrator managing Data Leak Prevention policies.'
                };
                setIsAuthenticated(true);
                setUser(newUser);
                localStorage.setItem('dlp_session_id', data.sessionId);
                await fetchPolicies();
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const signup = async (u: string, p: string) => {
        try {
            const response = await fetch('http://localhost:4000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p }),
            });

            const data = await response.json();

            if (response.ok) {
                // Return success or auto-login
                return data;
            } else {
                throw new Error(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    };

    const logout = async () => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (sessionId) {
            try {
                await fetch('http://localhost:4000/api/auth/logout', {
                    method: 'POST',
                    headers: { 'x-session-id': sessionId },
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('dlp_session_id');
    };

    const updateUserProfile = (profile: UserProfile) => {
        setUser(profile);
        localStorage.setItem('dlp_user', JSON.stringify(profile));
    };

    const addPolicy = async (p: Omit<Policy, 'id' | 'isEnabled'>) => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (!sessionId) return;

        try {
            const response = await fetch('http://localhost:4000/api/policies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify(p),
            });

            if (response.ok) {
                await fetchPolicies();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create policy');
            }
        } catch (error) {
            console.error('Add policy error:', error);
            throw error;
        }
    };

    const updatePolicy = async (p: Policy) => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (!sessionId) return;

        try {
            const response = await fetch(`http://localhost:4000/api/policies/${p.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    name: p.name,
                    description: p.description,
                    pattern: p.pattern,
                    type: p.type
                }),
            });

            if (response.ok) {
                await fetchPolicies();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update policy');
            }
        } catch (error) {
            console.error('Update policy error:', error);
            throw error;
        }
    };

    const togglePolicyStatus = async (id: number) => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (!sessionId) return;

        try {
            const response = await fetch(`http://localhost:4000/api/policies/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'x-session-id': sessionId },
            });

            if (response.ok) {
                await fetchPolicies();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to toggle policy');
            }
        } catch (error) {
            console.error('Toggle policy error:', error);
            throw error;
        }
    };

    const deletePolicy = async (id: number) => {
        const sessionId = localStorage.getItem('dlp_session_id');
        if (!sessionId) return;

        try {
            const response = await fetch(`http://localhost:4000/api/policies/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId },
            });

            if (response.ok) {
                await fetchPolicies();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete policy');
            }
        } catch (error) {
            console.error('Delete policy error:', error);
            throw error;
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <SecurityContext.Provider value={{
            scans, alerts, policies, totalFilesScanned, isAuthenticated, user, theme,
            runScan, resolveAlert, clearAllAlerts, clearAllScans, deleteAlert, login, signup, logout, updateUserProfile,
            addPolicy, updatePolicy, togglePolicyStatus, deletePolicy, toggleTheme, fetchPolicies
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export function useSecurity() {
    const context = useContext(SecurityContext);
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
}
