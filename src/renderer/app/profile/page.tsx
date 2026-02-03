'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Edit2, Save, X, LogOut } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, logout, updateUserProfile } = useSecurity();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);

    // Use empty defaults if user is not loaded yet
    const initialUser = user || {
        name: "Loading...",
        email: "",
        role: "Administrator",
        bio: "",
        avatar: "/placeholder-avatar.png"
    };

    const [formData, setFormData] = useState(initialUser);

    // Sync formData when global user changes
    useEffect(() => {
        if (user) setFormData(user);
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (user) setFormData(user);
        setIsEditing(false);
    };

    const displayUser = user || initialUser;

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent text-center">
                User Profile
            </h1>

            <div className="flex flex-col gap-8">
                {/* Profile Card */}
                <div className="w-full">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-lg">
                        <div className="w-32 h-32 rounded-full bg-neutral-800 flex items-center justify-center border-4 border-neutral-700 overflow-hidden">
                            {/* Fallback avatar if no image */}
                            <span className="text-4xl font-bold text-neutral-500">{displayUser.name.charAt(0)}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{displayUser.name}</h2>
                            <p className="text-neutral-400 text-sm">{displayUser.email}</p>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
                            <Shield size={14} />
                            <span>{displayUser.role}</span>
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="w-full mt-4 flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded-lg transition-colors border border-neutral-700 text-sm"
                        >
                            {isEditing ? (
                                <>
                                    <X size={16} />
                                    <span>Cancel Editing</span>
                                </>
                            ) : (
                                <>
                                    <Edit2 size={16} />
                                    <span>Edit Profile</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                logout();
                                router.push('/login');
                            }}
                            className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 px-4 rounded-lg transition-all border border-red-500/20 text-sm font-medium active:scale-[0.98]"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>

                {/* Details & Edit Section */}
                <div className="w-full space-y-6">

                    {/* Bio Section (Always Visible) */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                            About
                        </h3>
                        <p className="text-neutral-300 leading-relaxed">
                            {displayUser.bio}
                        </p>
                    </div>

                    {/* Edit Form - Conditionally Rendered */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isEditing ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-lg font-semibold text-white mb-4">Edit Information</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-400 uppercase">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-neutral-400 uppercase">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-400 uppercase">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        <Save size={18} />
                                        <span>Save Changes</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
