"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

export default function InvestorSettingsPage() {
    const [emailOn, setEmailOn] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                const res = await authenticatedFetch("/api/v1/settings");
                const data = res?.ok ? await res.json() : null;
                if (typeof data?.data?.notifications?.email === "boolean") setEmailOn(data.data.notifications.email);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const res = await authenticatedFetch("/api/v1/settings", {
                method: "PUT",
                body: JSON.stringify({ notifications: { email: emailOn } }),
            });
            if (res?.ok) toast.success("Settings saved");
            else toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0f8f8a]" /></div>;
    }

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="mt-1 text-slate-500">Investor Hub notification preferences.</p>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
                <div className="mb-4 flex items-center gap-3">
                    <Bell className="h-5 w-5 text-[#0f8f8a]" />
                    <h2 className="text-lg font-bold">Email notifications</h2>
                </div>
                <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                    <span className="text-sm font-semibold text-slate-800">Deal-flow and verification emails</span>
                    <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} />
                </label>
                <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f8f8a] px-5 py-2.5 font-semibold text-white disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                </button>
            </div>
        </div>
    );
}
