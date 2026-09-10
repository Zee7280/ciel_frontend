"use client";

import { useEffect, useState } from "react";
import { Button } from "../report/components/ui/button";
import { Bell, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { authenticatedFetch } from "@/utils/api";

interface StudentNotifications {
    email: boolean;
    sms: boolean;
    promotions: boolean;
    updates: boolean;
}

const defaultNotifications: StudentNotifications = {
    email: true,
    sms: false,
    promotions: false,
    updates: true
};

export default function StudentSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notifications, setNotifications] = useState<StudentNotifications>(defaultNotifications);

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await authenticatedFetch("/api/v1/settings");

                if (res?.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setNotifications({
                            ...defaultNotifications,
                            ...data.data.notifications
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
                body: JSON.stringify({ notifications })
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

    const handlePasswordChange = async () => {
        if (!passwords.current || !passwords.new) {
            toast.error("Enter your current and new password");
            return;
        }
        if (passwords.new.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            toast.error("Passwords don't match");
            return;
        }

        setIsChangingPassword(true);

        try {
            const res = await authenticatedFetch("/api/v1/profile/change-password", {
                method: "POST",
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.new
                })
            });

            if (res?.ok) {
                toast.success("Password changed successfully");
                setShowPasswordChange(false);
                setPasswords({ current: "", new: "", confirm: "" });
            } else {
                const data = await res?.json().catch(() => null);
                toast.error(data?.message || "Failed to change password");
            }
        } catch (error) {
            console.error("Failed to change password", error);
            toast.error("Failed to change password");
        } finally {
            setIsChangingPassword(false);
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
        <div className="mx-auto max-w-4xl space-y-6 pb-20 sm:space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account preferences and security settings.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-500" />
                        Notification Preferences
                    </h2>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="font-medium text-slate-900">Email Notifications</h3>
                            <p className="text-sm text-slate-500">Receive updates about your projects and reports via email.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.email}
                                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="font-medium text-slate-900">SMS Notifications</h3>
                            <p className="text-sm text-slate-500">Get important alerts directly to your phone.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.sms}
                                onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="font-medium text-slate-900">Platform Updates</h3>
                            <p className="text-sm text-slate-500">Be the first to know about new features and improvements.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.updates}
                                onChange={(e) => setNotifications({ ...notifications, updates: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-500" />
                        Security
                    </h2>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                    <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <h3 className="font-medium text-slate-900">Change Password</h3>
                            <p className="text-sm text-slate-500">Update your password regularly to keep your account secure.</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => setShowPasswordChange((prev) => !prev)}
                        >
                            {showPasswordChange ? "Cancel" : "Update Password"}
                        </Button>
                    </div>

                    {showPasswordChange && (
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Current Password"
                                autoComplete="current-password"
                                value={passwords.current}
                                onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                autoComplete="new-password"
                                value={passwords.new}
                                onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                autoComplete="new-password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <Button
                                onClick={handlePasswordChange}
                                disabled={isChangingPassword}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800"
                            >
                                {isChangingPassword ? "Updating..." : "Update Password"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full min-w-[120px] bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
