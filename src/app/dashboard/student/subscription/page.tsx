"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, Clock, CheckCircle, XCircle, GraduationCap, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";
import { refreshStoredUserFromMeApi } from "@/utils/membershipPayment";
import { studentNeedsSubscriptionPayment } from "@/utils/studentSubscription";
import { CIEL_OFFICIAL_BANK_ROWS } from "@/config/cielBankDetails";

type SubmissionStatus = "none" | "pending_review" | "approved" | "rejected" | null;

type StatusPayload = {
    requires_subscription_payment?: boolean;
    subscription_fee_submission_status?: SubmissionStatus;
    subscription_fee_amount_pkr?: number | null;
    subscription_reason?: string | null;
    account_status?: string;
    latest_submission?: {
        id: string;
        status: string;
        paid_amount_pkr: number;
        admin_feedback: string | null;
        created_at: string;
        reviewed_at: string | null;
    } | null;
};

function readStoredUser(): Record<string, unknown> | null {
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

/** One-time subscription fee for students whose university is not a CIEL member. */
export default function StudentSubscriptionPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<StatusPayload | null>(null);
    const [userSnapshot, setUserSnapshot] = useState<Record<string, unknown> | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [paidAmount, setPaidAmount] = useState("");
    const [recentSubmitAt, setRecentSubmitAt] = useState<Date | null>(null);

    const load = useCallback(async () => {
        await refreshStoredUserFromMeApi();
        setUserSnapshot(readStoredUser());
        try {
            const res = await authenticatedFetch("/api/v1/student/subscription/status", {}, { redirectToLogin: true });
            if (res?.ok) {
                const j = (await res.json().catch(() => null)) as { data?: StatusPayload } | null;
                if (j?.data) {
                    setStatus(j.data);
                    setPaidAmount((prev) =>
                        prev || (j.data?.subscription_fee_amount_pkr != null ? String(j.data.subscription_fee_amount_pkr) : ""),
                    );
                }
            }
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            await load();
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [load]);

    const needsPay = status?.requires_subscription_payment ?? (userSnapshot ? studentNeedsSubscriptionPayment(userSnapshot) : false);
    const submission: SubmissionStatus = status?.subscription_fee_submission_status ?? "none";
    const amount = status?.subscription_fee_amount_pkr ?? null;
    const rejectionNote = submission === "rejected" ? status?.latest_submission?.admin_feedback ?? null : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Attach your bank receipt or screenshot (PDF / image).");
            return;
        }
        const paid = parseInt(paidAmount.replace(/[^\d]/g, ""), 10);
        if (!Number.isFinite(paid) || paid <= 0) {
            toast.error("Enter the amount you transferred (whole PKR).");
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("proof", file);
            fd.append("paid_amount", String(paid));
            const res = await authenticatedFetch("/api/v1/student/subscription/submit-proof", { method: "POST", body: fd });
            if (!res) {
                toast.error("Upload failed");
                return;
            }
            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { message?: unknown };
                toast.error(typeof err.message === "string" ? err.message : "Upload failed");
                return;
            }
            const j = (await res.json().catch(() => ({}))) as { message?: string };
            toast.success(j.message || "Payment proof submitted");
            setFile(null);
            setRecentSubmitAt(new Date());
            await load();
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
                <h1 className="mt-4 text-xl font-semibold text-slate-900">No subscription payment required</h1>
                <p className="mt-2 text-slate-600">Your student portal is active. You can use the rest of the dashboard.</p>
            </div>
        );
    }

    const showSuccess = recentSubmitAt != null && submission === "pending_review";

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student subscription fee — bank transfer</h1>
                <p className="mt-1 text-slate-600">
                    {status?.subscription_reason ||
                        "Your university is not a CIEL member university, so a one-time subscription fee applies."}{" "}
                    Transfer the amount below, then attach your receipt or bank-app screenshot. An administrator verifies it and
                    your portal unlocks.
                </p>
            </div>

            {showSuccess ? (
                <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 shadow-md">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <FileCheck className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-emerald-950">Bank proof submitted</p>
                            <p className="mt-2 text-sm leading-relaxed text-emerald-900/90">
                                Your payment proof is queued for review. You will get access once it is verified. We will also notify
                                you by email.
                            </p>
                            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-emerald-200/80">
                                Submitted: {recentSubmitAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">One-time subscription fee (PKR)</p>
                        <p className="text-3xl font-bold text-slate-900">{amount != null ? amount.toLocaleString("en-PK") : "—"}</p>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/90">
                    <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2.5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Bank details — use for your transfer</p>
                    </div>
                    <dl className="divide-y divide-slate-100">
                        {CIEL_OFFICIAL_BANK_ROWS.map((row) => (
                            <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-center">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                                <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="border-t border-slate-200 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950">
                        <strong>Reference:</strong> put your full name and signup email in the transfer remarks so we can match the
                        payment.
                    </p>
                </div>

                <div className="mt-6 flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {submission === "pending_review" && (
                        <>
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span>
                                Proof on file — <strong>awaiting admin review</strong>. You will be notified once it is verified.
                            </span>
                        </>
                    )}
                    {submission === "rejected" && (
                        <>
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                            <span>
                                Last proof was <strong>rejected</strong>
                                {rejectionNote ? <> — &ldquo;{rejectionNote}&rdquo;</> : null}. Check the details and submit again.
                            </span>
                        </>
                    )}
                    {submission === "none" && (
                        <>
                            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                            <span>Bank receipt, transfer confirmation screenshot, or PDF from your bank app.</span>
                        </>
                    )}
                    {submission === "approved" && (
                        <>
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Proof approved. Refresh or sign in again if the dashboard is still locked.</span>
                        </>
                    )}
                </div>

                {submission !== "pending_review" && (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Amount transferred (PKR)</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value.replace(/[^\d]/g, ""))}
                                className="mt-1 block w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Payment proof (receipt / screenshot)</span>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {submission === "rejected" ? "Submit again" : "Submit bank proof"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
