"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Save, Shield } from "lucide-react";
import { toast } from "sonner";

import { authenticatedFetch } from "@/utils/api";

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
}

const defaultSettings: SettingsData = {
    notifications: { email: true, push: false, sms: false },
    privacy: { profileVisibility: "public", showEmail: false }
};

export default function FacultySettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await authenticatedFetch("/api/v1/settings");

                if (res?.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setSettings({
                            ...defaultSettings,
                            ...data.data,
                            notifications: {
                                ...defaultSettings.notifications,
                                ...data.data.notifications
                            },
                            privacy: {
                                ...defaultSettings.privacy,
                                ...data.data.privacy
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings", error);
                toast.error("Failed to load settings");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);

        try {
            const res = await authenticatedFetch("/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify(settings)
            });

            if (res?.ok) {
                toast.success("Settings saved successfully");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            console.error("Failed to save settings", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-0 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
                <p className="text-slate-500">Manage your faculty account preferences and settings</p>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <Bell className="h-6 w-6 text-blue-600" />
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
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.email}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, email: e.target.checked }
                                    }))}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300" />
                            </label>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">Push Notifications</h3>
                                <p className="text-sm text-slate-500">Receive browser notifications</p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.push}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, push: e.target.checked }
                                    }))}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300" />
                            </label>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">SMS Notifications</h3>
                                <p className="text-sm text-slate-500">Receive text messages</p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.sms}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        notifications: { ...prev.notifications, sms: e.target.checked }
                                    }))}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300" />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <Shield className="h-6 w-6 text-green-600" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Privacy & Security</h2>
                            <p className="text-sm text-slate-500">Control your privacy settings</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-slate-50 p-4">
                            <h3 className="mb-3 font-semibold text-slate-900">Profile Visibility</h3>
                            <select
                                value={settings.privacy.profileVisibility}
                                onChange={(e) => setSettings((prev) => ({
                                    ...prev,
                                    privacy: {
                                        ...prev.privacy,
                                        profileVisibility: e.target.value as SettingsData["privacy"]["profileVisibility"]
                                    }
                                }))}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
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
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.showEmail}
                                    onChange={(e) => setSettings((prev) => ({
                                        ...prev,
                                        privacy: { ...prev.privacy, showEmail: e.target.checked }
                                    }))}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300" />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Save All Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
