"use client";

import { useState, useEffect, useMemo } from "react";
import { User, Mail, Phone, Building, Camera, Lock, Loader2, Save, MapPin } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { missingProfileFieldsForRole } from "@/utils/profileCompletion";

interface Profile {
    id: number;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    role: string;
    organization: string;
    city: string;
    joinedDate: string;
}

function str(v: unknown): string {
    if (typeof v === "string") return v;
    if (v == null) return "";
    return String(v);
}

function extractProfileRecord(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== "object") return null;
    const o = body as Record<string, unknown>;
    const inner = o.data;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        const d = inner as Record<string, unknown>;
        if (d.user && typeof d.user === "object" && !Array.isArray(d.user)) {
            return d.user as Record<string, unknown>;
        }
        return d;
    }
    if (o.user && typeof o.user === "object" && !Array.isArray(o.user)) {
        return o.user as Record<string, unknown>;
    }
    return o;
}

function pickOrganizationName(raw: Record<string, unknown>): string {
    const o = raw.organization ?? raw.organisation;
    if (typeof o === "string") return o.trim();
    if (o && typeof o === "object" && o !== null && "name" in o) {
        const n = (o as { name?: unknown }).name;
        return typeof n === "string" ? n.trim() : "";
    }
    return str(raw.org_name || raw.organizationName || raw.orgName).trim();
}

function mapRawToProfile(raw: Record<string, unknown>): Profile {
    const joined =
        str(raw.joinedDate) ||
        str(raw.joinedAt) ||
        str(raw.created_at) ||
        str(raw.createdAt) ||
        str(raw.member_since) ||
        "";

    const idRaw = raw.id;
    const idNum = typeof idRaw === "number" ? idRaw : Number(idRaw);

    return {
        id: Number.isFinite(idNum) ? idNum : 0,
        name: str(raw.name || raw.full_name || raw.fullName).trim(),
        email: str(raw.email).trim(),
        phone: str(raw.phone || raw.contact || raw.mobile || raw.phone_number).trim(),
        avatar: str(raw.avatar || raw.avatar_url || raw.image).trim(),
        role: str(raw.role).trim(),
        organization: pickOrganizationName(raw),
        city: str(raw.city || raw.location || "").trim(),
        joinedDate: joined,
    };
}

function mergeProfiles(base: Profile | null, fromApi: Profile): Profile {
    const b = base;
    if (!b) return fromApi;
    return {
        id: fromApi.id || b.id,
        name: fromApi.name || b.name,
        email: fromApi.email || b.email,
        phone: fromApi.phone || b.phone,
        avatar: fromApi.avatar || b.avatar,
        role: fromApi.role || b.role,
        organization: fromApi.organization || b.organization,
        city: fromApi.city || b.city,
        joinedDate: fromApi.joinedDate || b.joinedDate,
    };
}

function formatMemberSince(isoOrDate: string): string | null {
    if (!isoOrDate.trim()) return null;
    const d = new Date(isoOrDate);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
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
            try {
                const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                if (raw) {
                    const stored = JSON.parse(raw) as Record<string, unknown>;
                    setProfile(mapRawToProfile(stored));
                }
            } catch {
                /* ignore */
            }

            const res = await authenticatedFetch(`/api/v1/profile`);
            if (res && res.ok) {
                const json = await res.json();
                const record = extractProfileRecord(json);
                if (record && Object.keys(record).length > 0) {
                    const mapped = mapRawToProfile(record);
                    setProfile((prev) => mergeProfiles(prev, mapped));
                    try {
                        const prevRaw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                        const prev = prevRaw ? (JSON.parse(prevRaw) as Record<string, unknown>) : {};
                        const merged = {
                            ...prev,
                            ...record,
                            name: mapped.name || prev.name,
                            phone: mapped.phone || prev.phone,
                            contact: mapped.phone || prev.contact || prev.phone,
                            email: mapped.email || prev.email,
                            city: mapped.city || prev.city,
                        };
                        localStorage.setItem("ciel_user", JSON.stringify(merged));
                        localStorage.setItem("user", JSON.stringify(merged));
                    } catch {
                        /* ignore cache sync errors */
                    }
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
        if (!profile?.name.trim()) {
            toast.error("Full name is required");
            return;
        }
        if (!profile?.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
            toast.error("Valid email is required");
            return;
        }
        if (!profile?.phone.trim()) {
            toast.error("Phone number is required");
            return;
        }
        if (!profile?.city.trim()) {
            toast.error("City / location is required");
            return;
        }
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/profile`, {
                method: 'PUT',
                body: JSON.stringify(profile)
            });
            if (res && res.ok) {
                toast.success("Profile updated successfully");
                setIsEditing(false);
                try {
                    const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
                    const p = profile!;
                    const merged = {
                        ...prev,
                        name: p.name,
                        email: p.email,
                        phone: p.phone,
                        contact: p.phone,
                        city: p.city,
                        organization: p.organization || prev.organization,
                    };
                    const s = JSON.stringify(merged);
                    localStorage.setItem("ciel_user", s);
                    localStorage.setItem("user", s);
                } catch {
                    /* ignore */
                }
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

    const missingPartnerProfile = useMemo(() => {
        if (!profile) return [];
        let stored: Record<string, unknown> = {};
        try {
            const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
            if (raw) stored = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            /* ignore */
        }
        const u: Record<string, unknown> = {
            ...stored,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            contact: profile.phone,
            organization: profile.organization || stored.organization,
            city: profile.city || stored.city,
        };
        return missingProfileFieldsForRole(String(profile.role || "ngo"), u);
    }, [profile]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    const memberSinceLabel = formatMemberSince(profile?.joinedDate || "");

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-500">Manage your personal information and settings</p>
            </div>

            {missingPartnerProfile.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 mb-6">
                    <p className="font-semibold text-sm">Complete your profile to post opportunities</p>
                    <p className="text-sm mt-1 text-amber-900/90">Still needed: {missingPartnerProfile.join(", ")}.</p>
                </div>
            ) : null}

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
                        {memberSinceLabel ? (
                            <p className="text-sm text-slate-400 mt-1">Member since {memberSinceLabel}</p>
                        ) : null}
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
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <MapPin className="w-4 h-4 inline mr-2" />
                                City / location <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profile?.city || ""}
                                onChange={(e) => setProfile((prev) => (prev ? { ...prev, city: e.target.value } : null))}
                                disabled={!isEditing}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                                placeholder="e.g. Karachi"
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
