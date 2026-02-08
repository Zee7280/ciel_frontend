"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Building, Camera, Lock, Loader2, Save } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface Profile {
    id: number;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    role: string;
    organization: string;
    joinedDate: string;
}

export default function PartnerProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/profile`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success) {
                    setProfile(data.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
            toast.error("Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/profile`, {
                method: 'PUT',
                body: JSON.stringify(profile)
            });
            if (res && res.ok) {
                toast.success("Profile updated successfully");
                setIsEditing(false);
            }
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwords.new !== passwords.confirm) {
            toast.error("Passwords don't match");
            return;
        }

        try {
            const res = await authenticatedFetch(`/api/v1/profile/change-password`, {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.new
                })
            });
            if (res && res.ok) {
                toast.success("Password changed successfully");
                setShowPasswordChange(false);
                setPasswords({ current: "", new: "", confirm: "" });
            }
        } catch (error) {
            toast.error("Failed to change password");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-500">Manage your personal information and settings</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-8 mb-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                            {profile?.name?.[0] || "U"}
                        </div>
                        <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-900">{profile?.name}</h2>
                        <p className="text-slate-500">{profile?.role}</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Member since {new Date(profile?.joinedDate || "").toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        {isEditing ? "Cancel" : "Edit Profile"}
                    </button>
                </div>

                {/* Profile Fields */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={profile?.name || ""}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                                disabled={!isEditing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={profile?.email || ""}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                                disabled={!isEditing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Phone className="w-4 h-4 inline mr-2" />
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={profile?.phone || ""}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                disabled={!isEditing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Building className="w-4 h-4 inline mr-2" />
                                Organization
                            </label>
                            <input
                                type="text"
                                value={profile?.organization || ""}
                                disabled
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Change Section */}
            <div className="bg-white rounded-2xl border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            Security
                        </h3>
                        <p className="text-slate-500 text-sm">Change your password</p>
                    </div>
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                    >
                        {showPasswordChange ? "Cancel" : "Change Password"}
                    </button>
                </div>

                {showPasswordChange && (
                    <div className="space-y-4">
                        <input
                            type="password"
                            placeholder="Current Password"
                            value={passwords.current}
                            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                        <input
                            type="password"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handlePasswordChange}
                            className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                        >
                            Update Password
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
