"use client";

import { useState, useEffect } from "react";
import { Bell, Shield, Loader2, Save } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";

interface SettingsData {
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    privacy: {
        profileVisibility: "public" | "private";
        showEmail: boolean;
    };
    language: string;
    theme: "light" | "dark";
}

export default function PartnerSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<SettingsData>({
        notifications: { email: true, push: false, sms: false },
        privacy: { profileVisibility: "public", showEmail: false },
        language: "en",
        theme: "light"
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await authenticatedFetch(`/api/v1/settings`);
            if (res && res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    setSettings((prev) => ({
                        ...prev,
                        ...data.data,
                        notifications: { ...prev.notifications, ...data.data.notifications },
                        privacy: { ...prev.privacy, ...data.data.privacy },
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast.error("Failed to load settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/settings`, {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            if (res && res.ok) {
                toast.success("Settings saved");
            } else {
                toast.error("Could not save settings. Please try again.");
            }
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-12 h-12 animate-spin text-[#0e7d74]" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Notification and privacy preferences for your account.</p>
            </div>

            <div className="space-y-6">
                {/* Notifications Settings */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-6 h-6 text-[#0e7d74]" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Notification Preferences</h2>
                            <p className="text-sm text-slate-500">Choose how you want to be notified</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Email Notifications</h3>
                                <p className="text-sm text-slate-500">Receive updates via email</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.email}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, email: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#bfe6df] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e7d74]"></div>
                            </label>
                        </div>
                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Push Notifications</h3>
                                <p className="text-sm text-slate-500">Receive browser notifications</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.push}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, push: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#bfe6df] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e7d74]"></div>
                            </label>
                        </div>
                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">SMS Notifications</h3>
                                <p className="text-sm text-slate-500">Receive text messages</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.sms}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, sms: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#bfe6df] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e7d74]"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-6 h-6 text-[#0e7d74]" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Privacy & Security</h2>
                            <p className="text-sm text-slate-500">Control your privacy settings</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <h3 className="font-semibold text-slate-900 mb-3">Profile Visibility</h3>
                            <select
                                value={settings.privacy.profileVisibility}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    privacy: { ...prev.privacy, profileVisibility: e.target.value as "public" | "private" }
                                }))}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-[#0e7d74] bg-white"
                            >
                                <option value="public">Public - Visible to everyone</option>
                                <option value="private">Private - Only visible to you</option>
                            </select>
                        </div>
                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Show Email Address</h3>
                                <p className="text-sm text-slate-500">Display email on public profile</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.showEmail}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        privacy: { ...prev.privacy, showEmail: e.target.checked }
                                    }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#bfe6df] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e7d74]"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0e7d74] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#0b6760] disabled:opacity-60 sm:w-auto"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save settings
                    </button>
                </div>
            </div>
        </div>
    );
}
