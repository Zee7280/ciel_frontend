"use client";

/**
 * Fully public — no CIEL login, ever. The partner contact named on an opportunity is an external
 * stakeholder who may have no CIEL account at all; the emailed token itself is their credential.
 * Click the link → see the opportunity → confirm. No `ciel_token` check, no redirect to /login.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Home, MapPin, Calendar, Users, Sparkles, PenLine } from "lucide-react";
import Link from "next/link";

type OpportunityDetailView = {
    overview: { title: string; types: string[]; mode: string | null; visibility: string | null };
    timeline: {
        type: string | null;
        start_date: string | null;
        end_date: string | null;
        expected_hours: number | null;
        volunteers_required: number | null;
    };
    location: { city: string | null; venue: string | null; pin: string | null };
    objectives: { description: string; beneficiaries_count: number | null; beneficiaries_type: string[] };
    sdg: { primary: Record<string, unknown> | null };
    activity: { student_responsibilities_preview: string; skills_gained: string[] };
    supervision: {
        faculty: { name: string | null; role: string | null; email: string | null; department: string | null; university: string | null; whatsapp: string | null };
        partner: { organization: string | null; contact_person: string | null; email: string | null };
    };
};

type Preview = {
    title: string;
    alreadyVerified: boolean;
    isStudentCreated: boolean;
    detail: OpportunityDetailView;
};

function backendBaseUrl(): string {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:3000/api/v1";
    return raw.endsWith("/api/v1") ? raw.replace(/\/api\/v1$/, "") : raw;
}

function PartnerVerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<
        "loading" | "ready" | "already" | "verifying" | "verified" | "deciding" | "decided" | "error"
    >("loading");
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState<Preview | null>(null);
    // Which of the two secondary actions the reviewer is about to confirm — reveals a reason box
    // and a second explicit confirm step, since these are harder to undo than "Verify".
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
                    `${backendBaseUrl()}/api/v1/verifications/partner-preview?token=${encodeURIComponent(token)}`,
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
                if (!data) {
                    setStatus("error");
                    setMessage("Could not open this link. Please try again.");
                    return;
                }
                setPreview(data);
                setStatus(data.alreadyVerified ? "already" : "ready");
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
                setMessage(body?.message || "Could not verify this opportunity. Please try again.");
                return;
            }
            setStatus("verified");
            setMessage(body?.message || "Thank you — your verification has been recorded.");
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
                const res = await fetch(`${backendBaseUrl()}/api/v1/verifications/partner-decision`, {
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

    const detail = preview?.detail;
    const faculty = detail?.supervision.faculty;
    const partner = detail?.supervision.partner;
    const timeline = detail?.timeline;
    const location = detail?.location;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 text-center">
                    Partner verification
                </p>
                <div className="flex justify-center mb-6">
                    {status === "loading" && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                    {(status === "ready" || status === "already") && <Sparkles className="w-12 h-12 text-emerald-600" />}
                    {(status === "verifying" || status === "deciding") && (
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    )}
                    {status === "verified" && <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
                    {status === "decided" && decisionOutcome === "reject" && (
                        <XCircle className="w-12 h-12 text-rose-500" />
                    )}
                    {status === "decided" && decisionOutcome === "revision" && (
                        <PenLine className="w-12 h-12 text-amber-500" />
                    )}
                    {status === "error" && <XCircle className="w-12 h-12 text-rose-500" />}
                </div>

                <h1 className="text-xl font-bold text-slate-900 mb-2 text-center">
                    {status === "loading" && "Opening opportunity…"}
                    {status === "ready" && "Review and confirm"}
                    {status === "already" && "Already verified"}
                    {status === "verifying" && "Confirming…"}
                    {status === "verified" && "Verified"}
                    {status === "deciding" && "Recording your decision…"}
                    {status === "decided" && decisionOutcome === "reject" && "Rejected"}
                    {status === "decided" && decisionOutcome === "revision" && "Revision requested"}
                    {status === "error" && "Could not open this link"}
                </h1>

                {status === "error" && <p className="text-slate-600 text-sm leading-relaxed mb-4 text-center">{message}</p>}
                {status === "already" && (
                    <p className="text-slate-600 text-sm leading-relaxed mb-4 text-center">
                        This opportunity — <strong>{preview?.title}</strong> — has already been verified. No further action is needed.
                    </p>
                )}
                {status === "verified" && <p className="text-slate-600 text-sm leading-relaxed mb-6 text-center">{message}</p>}
                {status === "decided" && <p className="text-slate-600 text-sm leading-relaxed mb-6 text-center">{message}</p>}

                {(status === "ready" || status === "verifying" || status === "deciding") && detail && (
                    <div className="space-y-4 mb-6">
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                            <h2 className="font-bold text-slate-900 text-base mb-1">{detail.overview.title}</h2>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-3">
                                {detail.overview.mode ? <span>{detail.overview.mode}</span> : null}
                                {detail.overview.types?.length ? <span>· {detail.overview.types.join(", ")}</span> : null}
                            </div>
                            {detail.objectives.description ? (
                                <p className="text-sm text-slate-700 leading-relaxed mb-3">{detail.objectives.description}</p>
                            ) : null}
                            <div className="space-y-1.5 text-xs text-slate-600">
                                {location?.city || location?.venue ? (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        {[location.venue, location.city].filter(Boolean).join(", ")}
                                    </div>
                                ) : null}
                                {timeline?.start_date || timeline?.end_date ? (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        {[timeline.start_date, timeline.end_date].filter(Boolean).join(" – ")}
                                        {timeline.expected_hours ? ` · ${timeline.expected_hours} hrs` : ""}
                                    </div>
                                ) : null}
                                {timeline?.volunteers_required ? (
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 shrink-0" />
                                        {timeline.volunteers_required} volunteers requested
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {(faculty?.name || partner?.organization) && (
                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 space-y-1">
                                {faculty?.name ? (
                                    <div>
                                        <span className="text-slate-400 uppercase tracking-wide font-bold text-[10px]">Faculty / requesting contact</span>
                                        <div className="text-slate-800 font-medium">
                                            {faculty.name}
                                            {faculty.role ? ` · ${faculty.role}` : ""}
                                        </div>
                                        {faculty.university ? <div>{faculty.university}{faculty.department ? ` · ${faculty.department}` : ""}</div> : null}
                                    </div>
                                ) : null}
                                {partner?.organization ? (
                                    <div className="pt-1.5 mt-1.5 border-t border-slate-200">
                                        <span className="text-slate-400 uppercase tracking-wide font-bold text-[10px]">Partner organization</span>
                                        <div className="text-slate-800 font-medium">{partner.organization}</div>
                                        {partner.contact_person ? <div>{partner.contact_person}</div> : null}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {status === "ready" && !pendingDecision && (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={verify}
                            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Verify this opportunity
                        </button>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDecision("revision")}
                                className="inline-flex items-center justify-center gap-2 flex-1 bg-white border border-amber-200 text-amber-700 font-semibold py-2.5 rounded-xl hover:bg-amber-50 text-sm"
                            >
                                <PenLine className="w-4 h-4" />
                                Request revision
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingDecision("reject")}
                                className="inline-flex items-center justify-center gap-2 flex-1 bg-white border border-rose-200 text-rose-700 font-semibold py-2.5 rounded-xl hover:bg-rose-50 text-sm"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject
                            </button>
                        </div>
                    </div>
                )}

                {status === "ready" && pendingDecision && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-700 font-medium">
                            {pendingDecision === "reject"
                                ? "Reject this opportunity? This is final — the student cannot resubmit it."
                                : "Ask the student to update something before you can approve it."}
                        </p>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                                pendingDecision === "reject"
                                    ? "Optional: let the student know why (recommended)"
                                    : "Optional: what should the student change?"
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
                                className="inline-flex items-center justify-center gap-2 flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => decide(pendingDecision)}
                                className={`inline-flex items-center justify-center gap-2 flex-1 text-white font-semibold py-2.5 rounded-xl text-sm ${
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
                        className="inline-flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-800 font-semibold py-3 rounded-xl hover:bg-slate-50 mt-3"
                    >
                        <Home className="w-4 h-4" />
                        Return home
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function PartnerVerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            }
        >
            <PartnerVerifyContent />
        </Suspense>
    );
}
