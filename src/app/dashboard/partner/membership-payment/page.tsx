"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, Clock, CheckCircle, XCircle, Building2, FileCheck } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import {
    partnerNeedsMembershipPayment,
    refreshStoredUserFromMeApi,
} from "@/utils/membershipPayment";
import { partnerMembershipPaymentConfig as cfg } from "@/config/partner-membership-payment";
import { toast } from "sonner";

type FeePayload = {
    applies?: boolean;
    amount_pkr?: number | null;
    role?: string;
};

type SubmissionStatus = "none" | "pending_review" | "approved" | "rejected" | null;

function readStoredUser(): Record<string, unknown> | null {
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

export default function PartnerMembershipPaymentPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fee, setFee] = useState<FeePayload | null>(null);
    const [userSnapshot, setUserSnapshot] = useState<Record<string, unknown> | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [recentSubmitAt, setRecentSubmitAt] = useState<Date | null>(null);

    const refreshLocalUser = useCallback(async () => {
        await refreshStoredUserFromMeApi();
        setUserSnapshot(readStoredUser());
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            await refreshLocalUser();
            try {
                const res = await authenticatedFetch("/api/v1/organization-membership/fee", {}, { redirectToLogin: true });
                if (res?.ok) {
                    const j = (await res.json().catch(() => null)) as { data?: FeePayload } | null;
                    const d = j?.data;
                    if (d && !cancelled) setFee(d);
                }
            } catch {
                /* ignore */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshLocalUser]);

    const needsPay = userSnapshot ? partnerNeedsMembershipPayment(userSnapshot) : false;
    const submission = (userSnapshot?.membership_fee_submission_status as SubmissionStatus) ?? null;
    const amountFromUser =
        typeof userSnapshot?.membership_fee_amount_pkr === "number" ? userSnapshot.membership_fee_amount_pkr : null;
    const apiAmount = fee?.amount_pkr ?? amountFromUser ?? null;
    const displayAmount =
        cfg.feePkrOverride != null ? cfg.feePkrOverride : apiAmount != null ? apiAmount : ("—" as const);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Attach your bank receipt or screenshot (PDF / image).");
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("proof", file);
            if (cfg.feePkrOverride != null) {
                fd.append("paid_amount", String(cfg.feePkrOverride));
            }
            const res = await authenticatedFetch("/api/v1/organization-membership/submit-proof", {
                method: "POST",
                body: fd,
            });
            if (!res) {
                toast.error("Upload failed");
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg =
                    typeof err === "object" && err !== null && "message" in err
                        ? String((err as { message: unknown }).message)
                        : "Upload failed";
                toast.error(msg);
                return;
            }
            const j = (await res.json().catch(() => ({}))) as { message?: string };
            toast.success(j.message || cfg.successPanelTitle);
            setFile(null);
            setRecentSubmitAt(new Date());
            await refreshLocalUser();
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading…
            </div>
        );
    }

    if (!needsPay) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
                <h1 className="mt-4 text-xl font-semibold text-slate-900">No payment required</h1>
                <p className="mt-2 text-slate-600">Your partner account is active. You can use the rest of the dashboard.</p>
            </div>
        );
    }

    const showBankReportSuccess =
        recentSubmitAt != null && submission === "pending_review";

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{cfg.pageTitle}</h1>
                <p className="mt-1 text-slate-600">{cfg.pageIntro}</p>
            </div>

            {showBankReportSuccess ? (
                <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 shadow-md">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <FileCheck className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-emerald-950">{cfg.successPanelTitle}</p>
                            <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">{cfg.successPanelBody}</p>
                            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-emerald-200/80">
                                Submitted: {recentSubmitAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Amount due (PKR)</p>
                        <p className="text-3xl font-bold text-slate-900">
                            {typeof displayAmount === "number" ? displayAmount.toLocaleString("en-PK") : displayAmount}
                        </p>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/90">
                    <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2.5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{cfg.bankSectionTitle}</p>
                    </div>
                    <dl className="divide-y divide-slate-100">
                        {cfg.bankRows.map((row) => (
                            <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-center">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                                <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="border-t border-slate-200 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950">
                        <strong>Reference:</strong> {cfg.referenceHint}
                    </p>
                </div>

                <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {submission === "pending_review" && (
                        <>
                            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>
                                Proof on file — <strong>awaiting admin review</strong>.
                            </span>
                        </>
                    )}
                    {submission === "rejected" && (
                        <>
                            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <span>
                                Last proof was <strong>rejected</strong>. Update bank details if needed, then submit again.
                            </span>
                        </>
                    )}
                    {submission === "none" && (
                        <>
                            <Upload className="h-4 w-4 shrink-0 text-slate-500" />
                            <span>{cfg.proofHint}</span>
                        </>
                    )}
                    {submission === "approved" && (
                        <>
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Proof approved. Refresh or sign in again if the dashboard is still locked.</span>
                        </>
                    )}
                </div>

                {submission !== "pending_review" && (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">{cfg.proofFieldLabel}</span>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            {submission === "rejected" ? cfg.resubmitButtonLabel : cfg.submitButtonLabel}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
