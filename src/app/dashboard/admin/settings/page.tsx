"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, Shield, Globe, Mail, FileCheck, CreditCard, PauseCircle, TimerOff } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import {
    parseReportPartnerApprovalSettingValue,
    REPORT_PARTNER_APPROVAL_SETTING_KEY,
} from "@/utils/reportPartnerApprovalDisplay";
import {
    MEMBERSHIP_FEE_PARTNER_PKR_KEY,
    parseMembershipFeePkrSettingValue,
    parsePartnerMembershipRequiredSettingValue,
    PARTNER_MEMBERSHIP_REQUIRED_KEY,
} from "@/utils/partnerMembershipDisplay";
import {
    DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE,
    DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE,
    parseStudentApplyMaintenanceEnabled,
    STUDENT_APPLY_CLOSED_BEFORE_KEY,
    STUDENT_APPLY_EXPIRED_MESSAGE_KEY,
    STUDENT_APPLY_MAINTENANCE_ENABLED_KEY,
    STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY,
} from "@/utils/studentApplyMaintenance";

type SettingRow = { key?: string; value?: string };

function settingsRowsToMap(rows: SettingRow[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const row of rows) {
        if (row?.key) map[row.key] = String(row.value ?? "");
    }
    return map;
}

/** Keys persisted by the "Save Changes" button. The backend stores one key/value row per call. */
const GENERAL_SETTING_KEYS = ["site_name", "contact_email", "maintenance_mode", "allow_registrations"] as const;

function parseBooleanSetting(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined) return fallback;
    const v = raw.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
    return fallback;
}

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingReportPartnerGate, setIsSavingReportPartnerGate] = useState(false);
    const [isSavingPartnerMembershipGate, setIsSavingPartnerMembershipGate] = useState(false);
    const [isSavingPartnerMembershipFee, setIsSavingPartnerMembershipFee] = useState(false);
    const [isSavingApplyMaintenance, setIsSavingApplyMaintenance] = useState(false);
    const [isSavingApplyMessage, setIsSavingApplyMessage] = useState(false);
    const [isExpiringExistingApplies, setIsExpiringExistingApplies] = useState(false);
    const [isSavingExpireToggle, setIsSavingExpireToggle] = useState(false);
    const [isSavingExpireMessage, setIsSavingExpireMessage] = useState(false);
    const [reportPartnerApprovalEnabled, setReportPartnerApprovalEnabled] = useState(true);
    const [partnerMembershipRequired, setPartnerMembershipRequired] = useState(false);
    const [partnerMembershipFeePkr, setPartnerMembershipFeePkr] = useState("1000");
    const [applyMaintenanceEnabled, setApplyMaintenanceEnabled] = useState(false);
    const [applyMaintenanceMessage, setApplyMaintenanceMessage] = useState(
        DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE,
    );
    const [applyClosedBefore, setApplyClosedBefore] = useState("");
    const [applyExpiredMessage, setApplyExpiredMessage] = useState(DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE);
    const [settings, setSettings] = useState({
        site_name: "",
        contact_email: "",
        maintenance_mode: false,
        allow_registrations: true,
        max_upload_size: "5MB",
    });

    const fetchSettings = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) setIsLoading(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`);
            if (res?.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    const map = settingsRowsToMap(data.data as SettingRow[]);
                    setReportPartnerApprovalEnabled(
                        parseReportPartnerApprovalSettingValue(map[REPORT_PARTNER_APPROVAL_SETTING_KEY], true),
                    );
                    setPartnerMembershipRequired(
                        parsePartnerMembershipRequiredSettingValue(map[PARTNER_MEMBERSHIP_REQUIRED_KEY], false),
                    );
                    setPartnerMembershipFeePkr(
                        String(parseMembershipFeePkrSettingValue(map[MEMBERSHIP_FEE_PARTNER_PKR_KEY], 1000)),
                    );
                    setApplyMaintenanceEnabled(
                        parseStudentApplyMaintenanceEnabled(
                            map[STUDENT_APPLY_MAINTENANCE_ENABLED_KEY],
                            false,
                        ),
                    );
                    setApplyMaintenanceMessage(
                        map[STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY]?.trim() ||
                            DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE,
                    );
                    setApplyClosedBefore(map[STUDENT_APPLY_CLOSED_BEFORE_KEY] || "");
                    setApplyExpiredMessage(
                        map[STUDENT_APPLY_EXPIRED_MESSAGE_KEY]?.trim() || DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE,
                    );
                    // The general settings live in the same flat key/value array.
                    setSettings((prev) => ({
                        ...prev,
                        site_name: map.site_name ?? prev.site_name,
                        contact_email: map.contact_email ?? prev.contact_email,
                        maintenance_mode: parseBooleanSetting(map.maintenance_mode, prev.maintenance_mode),
                        allow_registrations: parseBooleanSetting(map.allow_registrations, prev.allow_registrations),
                        max_upload_size: map.max_upload_size ?? prev.max_upload_size,
                    }));
                } else if (data.success && data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
                    setSettings((prev) => ({ ...prev, ...data.data }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            // A silent refetch (e.g. right after a successful save) shouldn't surface a scary
            // error toast on top of the save's own success toast — just log it.
            if (!options?.silent) toast.error("Could not load platform settings");
        } finally {
            if (!options?.silent) setIsLoading(false);
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

    const persistPartnerMembershipRequired = async (enabled: boolean) => {
        setIsSavingPartnerMembershipGate(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: PARTNER_MEMBERSHIP_REQUIRED_KEY,
                    value: enabled ? "true" : "false",
                }),
            });
            if (res?.ok) {
                setPartnerMembershipRequired(enabled);
                toast.success(
                    enabled
                        ? "Partner membership fee is ON — new NGO/partner signups must pay before full portal access."
                        : "Partner membership fee is OFF — new partners register without a membership step.",
                );
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to update partner membership setting");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to update partner membership setting", error);
            toast.error("Failed to update partner membership setting");
            await fetchSettings();
        } finally {
            setIsSavingPartnerMembershipGate(false);
        }
    };

    const handlePartnerMembershipToggle = (enabled: boolean) => {
        if (isSavingPartnerMembershipGate || enabled === partnerMembershipRequired) return;
        void persistPartnerMembershipRequired(enabled);
    };

    const persistPartnerMembershipFee = async () => {
        const amount = parseMembershipFeePkrSettingValue(partnerMembershipFeePkr, 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Enter a valid membership fee amount in PKR");
            return;
        }
        setIsSavingPartnerMembershipFee(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: MEMBERSHIP_FEE_PARTNER_PKR_KEY,
                    value: String(amount),
                }),
            });
            if (res?.ok) {
                setPartnerMembershipFeePkr(String(amount));
                toast.success(`Partner membership fee updated to PKR ${amount.toLocaleString()}`);
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to update partner membership fee");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to update partner membership fee", error);
            toast.error("Failed to update partner membership fee");
            await fetchSettings();
        } finally {
            setIsSavingPartnerMembershipFee(false);
        }
    };

    const persistApplyMaintenanceEnabled = async (enabled: boolean) => {
        setIsSavingApplyMaintenance(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: STUDENT_APPLY_MAINTENANCE_ENABLED_KEY,
                    value: enabled ? "true" : "false",
                }),
            });
            if (res?.ok) {
                setApplyMaintenanceEnabled(enabled);
                toast.success(
                    enabled
                        ? "Student apply is paused. Reports, attendance, and reviews still work."
                        : "Student apply is open again (except listings closed by the catalog cutoff).",
                );
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to update apply maintenance");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to update apply maintenance", error);
            toast.error("Failed to update apply maintenance");
            await fetchSettings();
        } finally {
            setIsSavingApplyMaintenance(false);
        }
    };

    const persistApplyMaintenanceMessage = async () => {
        const message = applyMaintenanceMessage.trim() || DEFAULT_STUDENT_APPLY_MAINTENANCE_MESSAGE;
        setIsSavingApplyMessage(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: STUDENT_APPLY_MAINTENANCE_MESSAGE_KEY,
                    value: message,
                }),
            });
            if (res?.ok) {
                setApplyMaintenanceMessage(message);
                toast.success("Apply pause message saved");
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to save apply message");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to save apply message", error);
            toast.error("Failed to save apply message");
            await fetchSettings();
        } finally {
            setIsSavingApplyMessage(false);
        }
    };

    const persistExpireExisting = async (enabled: boolean) => {
        if (isSavingExpireToggle) return;
        if (
            enabled &&
            !window.confirm(
                "Expire Join / Apply on every opportunity created so far? Enrolled students keep reports and attendance. New listings created after this can still accept applies unless Pause is on.",
            )
        ) {
            return;
        }
        if (
            !enabled &&
            !window.confirm(
                "Turn off Expire? Existing listings will accept Join / Apply again (unless Pause is on, or their own deadline has passed).",
            )
        ) {
            return;
        }
        setIsSavingExpireToggle(true);
        try {
            const stamped = enabled ? new Date().toISOString() : "";
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: STUDENT_APPLY_CLOSED_BEFORE_KEY,
                    value: stamped,
                }),
            });
            if (res?.ok) {
                setApplyClosedBefore(stamped);
                toast.success(
                    enabled
                        ? "Existing opportunities are now expired. Students cannot join or apply."
                        : "Expire is off. Existing listings can accept applications again.",
                );
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to update expire setting");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to update expire setting", error);
            toast.error("Failed to update expire setting");
            await fetchSettings();
        } finally {
            setIsSavingExpireToggle(false);
        }
    };

    const persistExpireMessage = async () => {
        const message = applyExpiredMessage.trim() || DEFAULT_STUDENT_APPLY_EXPIRED_MESSAGE;
        setIsSavingExpireMessage(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: STUDENT_APPLY_EXPIRED_MESSAGE_KEY,
                    value: message,
                }),
            });
            if (res?.ok) {
                setApplyExpiredMessage(message);
                toast.success("Expired opportunity message saved");
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to save expired message");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to save expired message", error);
            toast.error("Failed to save expired message");
            await fetchSettings();
        } finally {
            setIsSavingExpireMessage(false);
        }
    };

    const expireExistingApplications = async () => {
        if (
            !window.confirm(
                "Close Join / Apply on every opportunity created so far? Enrolled students keep reports and attendance. New listings created after this can still accept applies unless maintenance is on.",
            )
        ) {
            return;
        }
        setIsExpiringExistingApplies(true);
        try {
            const stamped = new Date().toISOString();
            const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: STUDENT_APPLY_CLOSED_BEFORE_KEY,
                    value: stamped,
                }),
            });
            if (res?.ok) {
                setApplyClosedBefore(stamped);
                toast.success("Existing opportunities can no longer accept new applications.");
            } else {
                const err = await res?.json().catch(() => ({}));
                toast.error((err as { message?: string }).message || "Failed to close existing applications");
                await fetchSettings();
            }
        } catch (error) {
            console.error("Failed to close existing applications", error);
            toast.error("Failed to close existing applications");
            await fetchSettings();
        } finally {
            setIsExpiringExistingApplies(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        // POST /admin/settings upserts a single { key, value } row, so send one request per key.
        const failedKeys: string[] = [];
        try {
            for (const key of GENERAL_SETTING_KEYS) {
                const value = String(settings[key]);
                try {
                    const res = await authenticatedFetch(`/api/v1/admin/settings`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key, value }),
                    });
                    if (!res?.ok) failedKeys.push(key);
                } catch (error) {
                    console.error(`Failed to save setting ${key}`, error);
                    failedKeys.push(key);
                }
            }

            if (failedKeys.length > 0) {
                toast.error(`Failed to save: ${failedKeys.join(", ")}`);
            } else {
                toast.success("Settings saved");
            }
            // Re-read so the form shows what was actually persisted.
            await fetchSettings({ silent: true });
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
                <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                        <PauseCircle className="h-5 w-5 text-amber-600" /> Student applications
                    </h3>
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                        <div className="min-w-0">
                            <div className="font-bold text-slate-900">Pause Join / Apply (temporary maintenance)</div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                When <strong>on</strong>, students cannot join or apply to any listing. The message below
                                is shown on Browse. Reports, attendance, faculty review, and admin tools keep working.
                            </p>
                        </div>
                        <label
                            className={`relative inline-flex shrink-0 cursor-pointer items-center ${
                                isSavingApplyMaintenance ? "pointer-events-none opacity-60" : ""
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={applyMaintenanceEnabled}
                                disabled={isSavingApplyMaintenance}
                                onChange={(e) => void persistApplyMaintenanceEnabled(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-100"></div>
                        </label>
                    </div>
                    {isSavingApplyMaintenance ? (
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-800">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                        </p>
                    ) : (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Current: {applyMaintenanceEnabled ? "Apply paused" : "Apply not paused"}
                        </p>
                    )}

                    <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                        <label className="block text-sm font-bold text-slate-700">Message students see</label>
                        <textarea
                            rows={3}
                            value={applyMaintenanceMessage}
                            onChange={(e) => setApplyMaintenanceMessage(e.target.value)}
                            disabled={isSavingApplyMessage}
                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-amber-500"
                        />
                        <button
                            type="button"
                            onClick={() => void persistApplyMaintenanceMessage()}
                            disabled={isSavingApplyMessage}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:opacity-70"
                        >
                            {isSavingApplyMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save message
                        </button>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                    <TimerOff className="h-4 w-4 text-slate-600" />
                                    Expire existing opportunities
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                    When <strong>on</strong>, listings already created show as <strong>Expired</strong> and
                                    students cannot Join / Apply. Reports, attendance, and reviews keep working. Listings
                                    created after you turn this on can still accept applies unless Pause is also on.
                                </p>
                            </div>
                            <label
                                className={`relative inline-flex shrink-0 cursor-pointer items-center ${
                                    isSavingExpireToggle ? "pointer-events-none opacity-60" : ""
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(applyClosedBefore)}
                                    disabled={isSavingExpireToggle}
                                    onChange={(e) => void persistExpireExisting(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-200"></div>
                            </label>
                        </div>
                        {isSavingExpireToggle ? (
                            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Saving…
                            </p>
                        ) : (
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Current: {applyClosedBefore ? "Expired" : "Not expired"}
                                {applyClosedBefore
                                    ? ` · cutoff ${new Date(applyClosedBefore).toLocaleString()}`
                                    : ""}
                            </p>
                        )}

                        <div className="mt-4 space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Expired message students see</label>
                            <textarea
                                rows={3}
                                value={applyExpiredMessage}
                                onChange={(e) => setApplyExpiredMessage(e.target.value)}
                                disabled={isSavingExpireMessage}
                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-slate-500"
                            />
                            <button
                                type="button"
                                onClick={() => void persistExpireMessage()}
                                disabled={isSavingExpireMessage}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-900 disabled:opacity-70"
                            >
                                {isSavingExpireMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save expired message
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => void expireExistingApplications()}
                            disabled={isExpiringExistingApplies}
                            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition-all hover:bg-slate-50 disabled:opacity-70"
                        >
                            {isExpiringExistingApplies ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Expire all opportunities created so far
                        </button>
                    </div>
                </div>

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
                        <CreditCard className="h-5 w-5 text-emerald-600" /> Partner registration membership
                    </h3>
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="min-w-0">
                            <div className="font-bold text-slate-900">Require membership fee for new NGO / partners</div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                When <strong>on</strong>, new partner signups start as pending membership payment and must
                                submit bank proof (or wait for admin activation) before using the partner portal. When{" "}
                                <strong>off</strong>, partners register without this step — same as current production default.
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-500">
                                University and corporate accounts always require membership fee regardless of this toggle.
                            </p>
                        </div>
                        <label
                            className={`relative inline-flex shrink-0 cursor-pointer items-center ${
                                isSavingPartnerMembershipGate ? "pointer-events-none opacity-60" : ""
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={partnerMembershipRequired}
                                disabled={isSavingPartnerMembershipGate}
                                onChange={(e) => handlePartnerMembershipToggle(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100"></div>
                        </label>
                    </div>
                    {isSavingPartnerMembershipGate ? (
                        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                        </p>
                    ) : (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Current: {partnerMembershipRequired ? "Required on signup" : "Not required on signup"}
                        </p>
                    )}

                    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                Partner membership fee (PKR)
                            </label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={partnerMembershipFeePkr}
                                onChange={(e) => setPartnerMembershipFeePkr(e.target.value)}
                                disabled={isSavingPartnerMembershipFee}
                                className="w-full max-w-xs rounded-lg border border-slate-200 px-4 py-2 outline-none transition-colors focus:border-emerald-500"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Used when partner membership is required. Shown on the partner bank-transfer screen via API.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void persistPartnerMembershipFee()}
                            disabled={isSavingPartnerMembershipFee}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-70"
                        >
                            {isSavingPartnerMembershipFee ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save fee
                        </button>
                    </div>
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
