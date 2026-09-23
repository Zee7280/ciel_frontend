"use client";

/**
 * Public faculty review. The emailed token is the credential — no CIEL login.
 * Approve, reject, and request revision happen on this page. The logged-in
 * Faculty → Approvals queue is unchanged.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, PenLine } from "lucide-react";
import Link from "next/link";
import {
    buildOpportunityRecordFlashcard,
    StudentOpportunityFlashcard,
} from "@/app/dashboard/student/create-opportunity/StudentOpportunityFlashcard";

type Preview = {
    title: string;
    alreadyVerified: boolean;
    closed: boolean;
    canDecide: boolean;
    isStudentCreated: boolean;
    record: Record<string, unknown>;
};

function backendBaseUrl(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000/api/v1";
    return raw.endsWith("/api/v1") ? raw.replace(/\/api\/v1$/, "") : raw;
}

function FacultyVerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<
        "loading" | "ready" | "already" | "closed" | "verifying" | "verified" | "deciding" | "decided" | "error"
    >("loading");
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState<Preview | null>(null);
    const [pendingDecision, setPendingDecision] = useState<"reject" | "revision" | null>(null);
    const [decisionOutcome, setDecisionOutcome] = useState<"reject" | "revision" | null>(null);
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid link. The security token is missing.");
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `${backendBaseUrl()}/api/v1/verifications/faculty-preview?token=${encodeURIComponent(token)}`,
                );
                if (cancelled) return;
                if (!res.ok) {
                    setStatus("error");
                    setMessage(
                        res.status === 404
                            ? "This verification link is no longer valid."
                            : "Could not open this link. Please try again.",
                    );
                    return;
                }
                const body = await res.json().catch(() => null);
                const data = body?.data as Preview | undefined;
                if (!data?.record) {
                    setStatus("error");
                    setMessage("Could not open this link. Please try again.");
                    return;
                }
                setPreview(data);
                if (data.alreadyVerified) setStatus("already");
                else if (data.closed) setStatus("closed");
                else setStatus("ready");
            } catch {
                if (!cancelled) {
                    setStatus("error");
                    setMessage("Could not reach CIEL PK. Please check your connection and try again.");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const verify = useCallback(async () => {
        if (!token) return;
        setStatus("verifying");
        setMessage("");
        try {
            const res = await fetch(`${backendBaseUrl()}/api/v1/verifications/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) {
                setStatus("error");
                setMessage(body?.message || "Could not approve this opportunity. Please try again.");
                return;
            }
            setStatus("verified");
            setMessage(body?.message || "Thank you — your approval has been recorded.");
        } catch {
            setStatus("error");
            setMessage("Could not reach CIEL PK. Please check your connection and try again.");
        }
    }, [token]);

    const decide = useCallback(
        async (action: "reject" | "revision") => {
            if (!token) return;
            setStatus("deciding");
            setMessage("");
            try {
                const res = await fetch(`${backendBaseUrl()}/api/v1/verifications/faculty-decision`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, action, reason: reason.trim() || undefined }),
                });
                const body = await res.json().catch(() => null);
                if (!res.ok || !body?.success) {
                    setStatus("error");
                    setMessage(body?.message || "Could not record your decision. Please try again.");
                    return;
                }
                setDecisionOutcome(action);
                setStatus("decided");
                setMessage(body?.message || "Your decision has been recorded.");
            } catch {
                setStatus("error");
                setMessage("Could not reach CIEL PK. Please check your connection and try again.");
            }
        },
        [token, reason],
    );

    const built = preview?.record ? buildOpportunityRecordFlashcard(preview.record) : null;
    const flashModel = built
        ? {
              ...built,
              title: preview?.title || built.title,
              badgeLabel: "Faculty review",
              eligible: false,
              eligibilityWhy:
                  "This link is for the faculty supervisor named on the opportunity. Students can apply only after it is approved and live.",
          }
        : null;

    const showActions = status === "ready" && preview?.canDecide;

    return (
        <div className="min-h-screen bg-[#f4f7f8] px-4 py-8">
            <div className="mx-auto w-full max-w-3xl">
                <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Faculty review
                </p>
                <div className="mb-4 flex justify-center">
                    {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-blue-500" />}
                    {(status === "verifying" || status === "deciding") && (
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    )}
                    {(status === "verified" || status === "already") && (
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    )}
                    {status === "decided" && decisionOutcome === "reject" && (
                        <XCircle className="h-10 w-10 text-rose-500" />
                    )}
                    {status === "decided" && decisionOutcome === "revision" && (
                        <PenLine className="h-10 w-10 text-amber-500" />
                    )}
                    {(status === "error" || status === "closed") && <XCircle className="h-10 w-10 text-rose-500" />}
                </div>

                <h1 className="mb-2 text-center text-xl font-bold text-slate-900">
                    {status === "loading" && "Opening opportunity…"}
                    {status === "ready" && "Review and decide"}
                    {status === "already" && "Already approved"}
                    {status === "closed" && "Already closed"}
                    {status === "verifying" && "Recording approval…"}
                    {status === "verified" && "Approved"}
                    {status === "deciding" && "Recording your decision…"}
                    {status === "decided" && decisionOutcome === "reject" && "Rejected"}
                    {status === "decided" && decisionOutcome === "revision" && "Revision requested"}
                    {status === "error" && "Could not open this link"}
                </h1>

                {status === "ready" && (
                    <p className="mb-4 text-center text-sm text-slate-600">
                        No CIEL login is required. Approve, request a revision, or reject from this page.
                    </p>
                )}
                {status === "already" && (
                    <p className="mb-4 text-center text-sm text-slate-600">
                        Faculty approval for <strong>{preview?.title}</strong> is already recorded.
                    </p>
                )}
                {status === "closed" && (
                    <p className="mb-4 text-center text-sm text-slate-600">
                        This opportunity is already closed. This link cannot change it.
                    </p>
                )}
                {(status === "error" || status === "verified" || status === "decided") && message ? (
                    <p className="mb-4 text-center text-sm text-slate-600">{message}</p>
                ) : null}

                {flashModel && status !== "loading" && status !== "error" ? (
                    <StudentOpportunityFlashcard model={flashModel} />
                ) : null}

                {showActions && !pendingDecision && (
                    <div className="mt-4 space-y-2">
                        <button
                            type="button"
                            onClick={() => void verify()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDecision("revision")}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                            >
                                <PenLine className="h-4 w-4" />
                                Request revision
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingDecision("reject")}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                            >
                                <XCircle className="h-4 w-4" />
                                Reject
                            </button>
                        </div>
                    </div>
                )}

                {showActions && pendingDecision && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-700">
                            {pendingDecision === "reject"
                                ? "Reject this opportunity? This is final — it cannot be resubmitted."
                                : "Ask for an update before you approve it. The creator can edit and send it back."}
                        </p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                                pendingDecision === "reject"
                                    ? "Optional: say why (recommended)"
                                    : "Optional: what should be changed?"
                            }
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingDecision(null);
                                    setReason("");
                                }}
                                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void decide(pendingDecision)}
                                className={`inline-flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-white ${
                                    pendingDecision === "reject"
                                        ? "bg-rose-600 hover:bg-rose-700"
                                        : "bg-amber-500 hover:bg-amber-600"
                                }`}
                            >
                                Confirm {pendingDecision === "reject" ? "rejection" : "revision request"}
                            </button>
                        </div>
                    </div>
                )}

                {status !== "loading" && status !== "verifying" && status !== "deciding" && (
                    <Link
                        href="/"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-800 hover:bg-slate-50"
                    >
                        <Home className="h-4 w-4" />
                        Return home
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function FacultyVerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
            }
        >
            <FacultyVerifyContent />
        </Suspense>
    );
}
