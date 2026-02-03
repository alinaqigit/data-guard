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
    id: string;
    name: string;
    description: string;
    type: string;
    status: 'Active' | 'Disabled';
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
    login: (username: string, pass: string) => void;
    logout: () => void;
    updateUserProfile: (profile: UserProfile) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    addPolicy: (policy: Omit<Policy, 'id'>) => void;
    updatePolicy: (policy: Policy) => void;
    togglePolicyStatus: (id: string) => void;
    deletePolicy: (id: string) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    const [scans, setScans] = useState<Scan[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [totalFilesScanned, setTotalFilesScanned] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [policies, setPolicies] = useState<Policy[]>([
        {
            id: 'POL-8090',
            name: 'CNIC Detection Policy',
            description: 'Detection and prevention of CNIC numbers in outbound communications.',
            type: 'SENSITIVE_DATA',
            status: 'Active'
        },
        {
            id: 'POL-8122',
            name: 'Phone Number Protection',
            description: 'Monitor for unauthorized sharing of corporate contact information.',
            type: 'SENSITIVE_DATA',
            status: 'Active'
        }
    ]);

    // Load initial mock data or from localStorage
    useEffect(() => {
        const savedAuth = localStorage.getItem('dlp_auth');
        const savedUser = localStorage.getItem('dlp_user');
        const savedPolicies = localStorage.getItem('dlp_policies');
        const savedTheme = localStorage.getItem('dlp_theme') as 'light' | 'dark';

        if (savedAuth === 'true') {
            setIsAuthenticated(true);
            if (savedUser) setUser(JSON.parse(savedUser));
        }
        if (savedPolicies) setPolicies(JSON.parse(savedPolicies));
        if (savedTheme) setTheme(savedTheme);
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

    const login = (u: string, p: string) => {
        // Mock login
        const newUser: UserProfile = {
            name: u || 'Admin User',
            email: `${u.toLowerCase().replace(/\s+/g, '.')}@example.com` || 'admin@example.com',
            role: 'Security Administrator',
            bio: 'Dashboard administrator managing Data Leak Prevention policies.'
        };
        setIsAuthenticated(true);
        setUser(newUser);
        localStorage.setItem('dlp_auth', 'true');
        localStorage.setItem('dlp_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('dlp_auth');
        localStorage.removeItem('dlp_user');
    };

    const updateUserProfile = (profile: UserProfile) => {
        setUser(profile);
        localStorage.setItem('dlp_user', JSON.stringify(profile));
    };

    const addPolicy = (p: Omit<Policy, 'id'>) => {
        const newPolicy: Policy = {
            ...p,
            id: `POL-${Math.floor(Math.random() * 9000) + 1000}`
        };
        setPolicies(prev => [newPolicy, ...prev]);
    };

    const updatePolicy = (p: Policy) => {
        setPolicies(prev => prev.map(policy => policy.id === p.id ? p : policy));
    };

    const togglePolicyStatus = (id: string) => {
        setPolicies(prev => prev.map(p =>
            p.id === id ? { ...p, status: p.status === 'Active' ? 'Disabled' : 'Active' } : p
        ));
    };

    const deletePolicy = (id: string) => {
        setPolicies(prev => prev.filter(p => p.id !== id));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <SecurityContext.Provider value={{
            scans, alerts, policies, totalFilesScanned, isAuthenticated, user, theme,
            runScan, resolveAlert, clearAllAlerts, clearAllScans, deleteAlert, login, logout, updateUserProfile,
            addPolicy, updatePolicy, togglePolicyStatus, deletePolicy, toggleTheme
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
