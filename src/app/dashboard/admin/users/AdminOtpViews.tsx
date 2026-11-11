"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { readErrorMessage } from "@/components/admin/useAbortableFetch";
import {
    normalizeActiveOtps,
    otpExpiryLabel,
    otpPurposeLabel,
    type AdminActiveOtp,
} from "@/utils/adminActiveOtp";

async function copyOtp(code: string) {
    try {
        await navigator.clipboard.writeText(code);
        toast.success("OTP copied");
    } catch {
        toast.error("Could not copy OTP");
    }
}

function OtpLine({ otp, revealed, showEmail }: { otp: AdminActiveOtp; revealed: boolean; showEmail?: boolean }) {
    const expiry = otpExpiryLabel(otp.expiresAt);
    return (
        <div className="flex min-w-0 items-center gap-1">
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            <code className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-amber-900">
                {revealed ? otp.code : "••••••"}
            </code>
            <button
                type="button"
                onClick={() => void copyOtp(otp.code)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="Copy OTP"
                aria-label="Copy OTP"
            >
                <Copy className="h-3 w-3" />
            </button>
            <span className="min-w-0 truncate text-[11px] text-slate-500" title={`${otpPurposeLabel(otp)}${expiry ? ` · ${expiry}` : ""}`}>
                {showEmail ? <strong className="font-semibold text-slate-700">{otp.email} · </strong> : null}
                {otpPurposeLabel(otp)}
                {otp.verified ? " · already entered" : ""}
                {expiry ? ` · ${expiry}` : ""}
                {showEmail && otp.hasAccount === false ? " · no account yet" : ""}
            </span>
        </div>
    );
}

/** Password column, under the password: this account's live OTP codes (hidden with the password). */
export function UserOtpCodes({ otps, revealed }: { otps?: AdminActiveOtp[]; revealed: boolean }) {
    if (!otps?.length) return null;
    return (
        <div className="flex flex-col gap-0.5 pb-1">
            {otps.map((otp, i) => (
                <OtpLine key={`${otp.purpose}-${otp.code}-${i}`} otp={otp} revealed={revealed} />
            ))}
        </div>
    );
}

/**
 * Passwords view: every live OTP, including signups whose email has no account yet (those never
 * appear in the users table). Follows the page search box; codes expire in minutes, so Refresh.
 */
export function ActiveOtpPanel({ search, onRefresh }: { search: string; onRefresh?: () => void }) {
    const [otps, setOtps] = useState<AdminActiveOtp[]>([]);
    const [loading, setLoading] = useState(false);
    const [revealed, setRevealed] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query = search ? `?${new URLSearchParams({ search }).toString()}` : "";
            const res = await authenticatedFetch(`/api/v1/admin/otps/active${query}`);
            if (!res) return;
            if (!res.ok) {
                toast.error(await readErrorMessage(res, "Failed to load OTPs"));
                return;
            }
            const body = await res.json();
            setOtps(normalizeActiveOtps(body?.data));
        } catch (error) {
            console.error("Failed to load OTPs", error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                    Live OTP codes{search ? ` matching “${search}”` : ""}
                    <span className="ml-1 font-normal text-amber-800/80">
                        · signup and team verification codes that have not expired
                    </span>
                </p>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setRevealed((v) => !v)}
                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                        {revealed ? "Hide codes" : "Show codes"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void load();
                            onRefresh?.();
                        }}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Refresh
                    </button>
                </div>
            </div>
            <div className="mt-2 flex flex-col gap-1">
                {otps.length ? (
                    otps.map((otp, i) => <OtpLine key={`${otp.email}-${otp.purpose}-${otp.code}-${i}`} otp={otp} revealed={revealed} showEmail />)
                ) : (
                    <p className="text-xs text-amber-800/80">
                        {loading ? "Loading…" : "No live OTP right now. Codes appear here when someone requests one and disappear when they expire."}
                    </p>
                )}
            </div>
        </div>
    );
}
