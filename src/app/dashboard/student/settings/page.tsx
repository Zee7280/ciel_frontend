"use client";

import { useState } from "react";
import { Button } from "../report/components/ui/button";
import { Bell, Lock, Shield, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function StudentSettingsPage() {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        promotions: false,
        updates: true
    });

    const handleSave = () => {
        // Mock save functionality
        toast.success("Settings saved successfully!");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account preferences and security settings.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-500" />
                        Notification Preferences
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
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

                    <div className="flex items-center justify-between">
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

                    <div className="flex items-center justify-between">
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
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-500" />
                        Security
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="font-medium text-slate-900">Change Password</h3>
                            <p className="text-sm text-slate-500">Update your password regularly to keep your account secure.</p>
                        </div>
                        <Button variant="outline">Update Password</Button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
