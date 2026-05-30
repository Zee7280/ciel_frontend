"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Shield, Globe, Mail, FileCheck } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import {
    parseReportPartnerApprovalSettingValue,
    REPORT_PARTNER_APPROVAL_SETTING_KEY,
} from "@/utils/reportPartnerApprovalDisplay";

type SettingRow = { key?: string; value?: string };

function settingsRowsToMap(rows: SettingRow[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const row of rows) {
        if (row?.key) map[row.key] = String(row.value ?? "");
    }
    return map;
}

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingReportPartnerGate, setIsSavingReportPartnerGate] = useState(false);
    const [reportPartnerApprovalEnabled, setReportPartnerApprovalEnabled] = useState(true);
    const [settings, setSettings] = useState({
        site_name: "",
        contact_email: "",
        maintenance_mode: false,
        allow_registrations: true,
        max_upload_size: "5MB",
    });

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`);
            if (res?.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    const map = settingsRowsToMap(data.data as SettingRow[]);
                    setReportPartnerApprovalEnabled(
                        parseReportPartnerApprovalSettingValue(map[REPORT_PARTNER_APPROVAL_SETTING_KEY], true),
                    );
                } else if (data.success && data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
                    setSettings((prev) => ({ ...prev, ...data.data }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast.error("Could not load platform settings");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const persistReportPartnerApproval = async (enabled: boolean) => {
        setIsSavingReportPartnerGate(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: REPORT_PARTNER_APPROVAL_SETTING_KEY,
                    value: enabled ? "true" : "false",
                }),
            });
            if (res?.ok) {
                setReportPartnerApprovalEnabled(enabled);
                toast.success(
                    enabled
                        ? "NGO/partner report approval is ON — reports may need partner sign-off before final verify."
                        : "NGO/partner report approval is OFF — admin approve will finalize reports without partner step.",
                );
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to update report approval setting");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to update report partner approval setting", error);
            toast.error("Failed to update report approval setting");
            await fetchSettings();
        } finally {
            setIsSavingReportPartnerGate(false);
        }
    };

    const handleReportPartnerToggle = (enabled: boolean) => {
        if (isSavingReportPartnerGate || enabled === reportPartnerApprovalEnabled) return;
        void persistReportPartnerApproval(enabled);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (res?.ok) {
                console.log("Settings saved");
            }
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl p-0 lg:p-8">
            <div className="mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">System Settings</h1>
                    <p className="text-slate-500">Configure global platform settings.</p>
                </div>
                <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-70"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                        <FileCheck className="h-5 w-5 text-indigo-600" /> Impact report workflow
                    </h3>
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <div className="min-w-0">
                            <div className="font-bold text-slate-900">Require NGO / partner approval on reports</div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                When <strong>on</strong>, impact reports that include a partner or NGO may stay in
                                review until the linked organization approves, then CIEL Admin can mark them verified.
                                When <strong>off</strong>, admin approval finalizes the report without a partner step.
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-500">
                                Does not change opportunity creation, student join, or attendance approval flows.
                            </p>
                        </div>
                        <label
                            className={`relative inline-flex shrink-0 cursor-pointer items-center ${
                                isSavingReportPartnerGate ? "pointer-events-none opacity-60" : ""
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={reportPartnerApprovalEnabled}
                                disabled={isSavingReportPartnerGate}
                                onChange={(e) => handleReportPartnerToggle(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100"></div>
                        </label>
                    </div>
                    {isSavingReportPartnerGate ? (
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-indigo-700">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                        </p>
                    ) : (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Current: {reportPartnerApprovalEnabled ? "Enabled" : "Disabled"}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                        <Globe className="h-5 w-5 text-blue-500" /> General Information
                    </h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">Site Name</label>
                            <input
                                type="text"
                                value={settings.site_name}
                                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none transition-colors focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">Support Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={settings.contact_email}
                                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 outline-none transition-colors focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                        <Shield className="h-5 w-5 text-red-500" /> System Control
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4">
                            <div>
                                <div className="font-bold text-slate-900">Maintenance Mode</div>
                                <div className="text-sm text-slate-500">Disable access for all non-admin users.</div>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.maintenance_mode}
                                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100"></div>
                            </label>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4">
                            <div>
                                <div className="font-bold text-slate-900">Allow Registrations</div>
                                <div className="text-sm text-slate-500">Enable new user signups.</div>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.allow_registrations}
                                    onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.checked })}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
