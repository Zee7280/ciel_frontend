"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

/**
 * Partner / responsible person's no-login follow-up page (Section 9.5). The emailed token is the
 * only credential; the backend validates, rate-limits and expires it. Nothing here needs a CIEL
 * account, and nothing is recorded until the person presses Confirm.
 */

type PublicQuestion = { id: string; activityTitle: string; questionText: string; countLabel: string | null };
type PublicFollowUp = {
    status: string;
    recipientName: string;
    recipientRole: string;
    dueDate: string;
    intervalLabel: string;
    checkFocus: string;
    respondedAt: string | null;
    respondentName: string;
    declinedAt: string | null;
    projectRef: {
        title: string;
        projectId: string;
        reportId: string;
        host: string;
        university: string;
        location: string;
        periodStart: string;
        periodEnd: string;
        objective: string;
        beneficiaries: string;
        studentTeam: string;
    } | null;
    questions: PublicQuestion[];
    answers: Array<{ questionId: string; choice: string; numericValue: string | null; note: string }>;
};

const CHOICES: Array<{ value: string; label: string }> = [
    { value: "yes", label: "Yes" },
    { value: "partially", label: "Partially" },
    { value: "no", label: "No" },
    { value: "unable_to_verify", label: "Unable to verify" },
];

function pretty(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "Not set";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { message?: unknown; error?: unknown };
        const m = Array.isArray(body?.message) ? body.message.join(" ") : body?.message || body?.error;
        return typeof m === "string" && m.trim() ? m : fallback;
    } catch {
        return fallback;
    }
}

function ReferenceBlock({ reference: ref }: { reference: NonNullable<PublicFollowUp["projectRef"]> }) {
    const rows: Array<[string, string]> = [
        ["Project", ref.title],
        ["Project ID", ref.projectId],
        ["Report ID", ref.reportId],
        ["Host organisation", ref.host],
        ["University", ref.university],
        ["Location", ref.location],
        ["Project period", [ref.periodStart, ref.periodEnd].filter(Boolean).map(pretty).join(" – ")],
        ["Beneficiary group", ref.beneficiaries],
        ["Student team", ref.studentTeam],
    ];
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-2xl border border-[#d9e8e5] bg-[#f5fbfa] p-4 text-sm sm:grid-cols-2">
            {rows.filter(([, v]) => v && v.trim()).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                    <dt className="w-36 shrink-0 text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-900">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

function FollowUpResponse() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const wantsDecline = searchParams.get("action") === "decline";

    const [loading, setLoading] = useState(true);
    const [fatal, setFatal] = useState<string | null>(null);
    const [data, setData] = useState<PublicFollowUp | null>(null);
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [comment, setComment] = useState("");
    const [name, setName] = useState("");
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<"responded" | "declined" | null>(null);
    const [declineOpen, setDeclineOpen] = useState(wantsDecline);
    const [declineReason, setDeclineReason] = useState("");
    const [optOutAll, setOptOutAll] = useState(false);

    const load = useCallback(async () => {
        if (!token) {
            setFatal("This link is missing its security token. Please open the link from your email again.");
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/v1/public/followups/${encodeURIComponent(token)}`, { cache: "no-store" });
            if (!res.ok) {
                setFatal(await readError(res, "This follow-up link is not valid or has expired."));
                return;
            }
            const body = (await res.json()) as PublicFollowUp;
            setData(body);
            setName(body.recipientName || "");
            if (body.status === "responded") setDone("responded");
            if (body.status === "declined") setDone("declined");
        } catch {
            setFatal("We could not load this follow-up. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const submit = async () => {
        if (!data) return;
        setError(null);
        const missing = data.questions.filter((q) => !choices[q.id]);
        if (missing.length) {
            setError(`Please answer every question (choose "Unable to verify" if you cannot check it): ${missing.map((q) => q.activityTitle).join(", ")}.`);
            return;
        }
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        if (!consent) {
            setError("Please confirm that these answers reflect what you can observe.");
            return;
        }
        setBusy(true);
        try {
            const res = await fetch(`/api/v1/public/followups/${encodeURIComponent(token)}/response`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    representativeName: name.trim(),
                    consent: true,
                    generalComment: comment.trim() || undefined,
                    answers: data.questions.map((q) => ({
                        questionId: q.id,
                        choice: choices[q.id],
                        numericValue: counts[q.id]?.trim() ? Number(counts[q.id]) : undefined,
                        note: notes[q.id]?.trim() || undefined,
                    })),
                }),
            });
            if (!res.ok) {
                setError(await readError(res, "Your answers could not be saved. Please try again."));
                return;
            }
            setDone("responded");
        } catch {
            setError("Your answers could not be saved. Please check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    const decline = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/public/followups/${encodeURIComponent(token)}/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: declineReason.trim() || undefined, optOut: optOutAll || undefined }),
            });
            if (!res.ok) {
                setError(await readError(res, "We could not record this. Please try again."));
                return;
            }
            setDone("declined");
        } catch {
            setError("We could not record this. Please check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f8f7] text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading follow-up…
            </div>
        );
    }

    if (fatal || !data) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4">
                <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <XCircle className="mx-auto h-10 w-10 text-rose-500" />
                    <h1 className="mt-4 text-lg font-bold text-slate-900">Follow-up link unavailable</h1>
                    <p className="mt-2 text-sm text-slate-600">{fatal || "This follow-up link is not valid."}</p>
                </div>
            </main>
        );
    }

    const ref = data.projectRef;

    return (
        <main className="min-h-screen bg-[#f4f8f7] px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-5">
                <header className="rounded-3xl bg-[#0c746e] p-6 text-white shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9f2ee]">CIEL PK · Partner verification</p>
                    <h1 className="mt-1 text-2xl font-extrabold">{ref?.title || "Community engagement project"}</h1>
                    <p className="mt-2 text-sm text-[#e4f5f0]">
                        You are being asked to confirm whether the outcomes of this specific student project have continued. No account is required.
                    </p>
                </header>

                {ref ? <ReferenceBlock reference={ref} /> : null}
                {ref?.objective ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <b>Original project goal:</b> {ref.objective}
                    </p>
                ) : null}
                <p className="text-xs text-slate-500">
                    To: {data.recipientName || "Partner representative"}{data.recipientRole ? `, ${data.recipientRole}` : ""} · Follow-up due {pretty(data.dueDate)}
                </p>

                {done === "responded" ? (
                    <div className="rounded-3xl border border-[#bfe6e2] bg-[#e6f6f4] p-6 text-center">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-[#0c746e]" />
                        <h2 className="mt-3 text-lg font-bold text-slate-900">Thank you. Your answers are recorded.</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            CIEL PK will review them with the student&apos;s report. They are stored as partner-reported observations, not as an independent audit.
                        </p>
                    </div>
                ) : done === "declined" ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
                        <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
                        <h2 className="mt-3 text-lg font-bold text-slate-900">Noted. We will not contact you again about this project{optOutAll ? ", or any other" : ""}.</h2>
                        <p className="mt-1 text-sm text-slate-600">If you reach the right person, they can ask CIEL PK to reopen the follow-up.</p>
                    </div>
                ) : (
                    <>
                        {data.questions.map((q, i) => (
                            <section key={q.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0c746e]">
                                    Question {i + 1} of {data.questions.length} · {q.activityTitle}
                                </p>
                                <h2 className="mt-1 text-base font-semibold text-slate-900">{q.questionText}</h2>
                                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={q.questionText}>
                                    {CHOICES.map((c) => {
                                        const on = choices[q.id] === c.value;
                                        return (
                                            <button
                                                key={c.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() => setChoices((s) => ({ ...s, [q.id]: c.value }))}
                                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-[#0c746e] bg-[#0c746e] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-[#0c746e]"}`}
                                            >
                                                {c.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {q.countLabel ? (
                                        <label className="text-xs font-semibold text-slate-600">
                                            Optional number · {q.countLabel}
                                            <input
                                                type="number"
                                                min={0}
                                                inputMode="numeric"
                                                value={counts[q.id] || ""}
                                                onChange={(e) => setCounts((s) => ({ ...s, [q.id]: e.target.value }))}
                                                placeholder="Actual number, if known"
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                            />
                                        </label>
                                    ) : null}
                                    <label className="text-xs font-semibold text-slate-600">
                                        Optional detail or issue
                                        <input
                                            value={notes[q.id] || ""}
                                            maxLength={1000}
                                            onChange={(e) => setNotes((s) => ({ ...s, [q.id]: e.target.value }))}
                                            placeholder="e.g. artwork intact, but no longer used in lessons"
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                        />
                                    </label>
                                </div>
                            </section>
                        ))}

                        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <label className="block text-xs font-semibold text-slate-600">
                                General comment (optional)
                                <textarea
                                    value={comment}
                                    maxLength={2000}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Any additional context you want CIEL PK to know"
                                    className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-600">
                                Your name
                                <input
                                    value={name}
                                    maxLength={160}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                />
                            </label>
                            <label className="flex items-start gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                                <span>I confirm these answers reflect what I can observe about this project today.</span>
                            </label>
                            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p> : null}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => void submit()}
                                    disabled={busy}
                                    className="rounded-xl bg-[#0c746e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                                >
                                    {busy ? "Saving…" : `Confirm ${data.questions.length} answer${data.questions.length === 1 ? "" : "s"}`}
                                </button>
                                <button type="button" onClick={() => setDeclineOpen((v) => !v)} className="text-sm font-semibold text-rose-700 underline">
                                    Decline / not the right representative
                                </button>
                            </div>
                            {declineOpen ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm text-slate-700">Tell us briefly why (optional), then confirm. We will stop emailing you about this project.</p>
                                    <input
                                        value={declineReason}
                                        maxLength={500}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="e.g. I have left the organisation; contact Mr Ahmed instead"
                                        className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    />
                                    <label className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                                        <input type="checkbox" checked={optOutAll} onChange={(e) => setOptOutAll(e.target.checked)} className="mt-0.5" />
                                        <span>Also stop all future CIEL PK follow-up emails to this address (for any project).</span>
                                    </label>
                                    <button type="button" onClick={() => void decline()} disabled={busy} className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                                        Confirm decline
                                    </button>
                                </div>
                            ) : null}
                        </section>
                    </>
                )}

                <p className="text-center text-xs text-slate-400">CIEL PK – Community Impact Education Lab · www.cielpk.com</p>
            </div>
        </main>
    );
}

export default function FollowUpVerifyPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>}>
            <FollowUpResponse />
        </Suspense>
    );
}
