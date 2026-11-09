"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

/**
 * Admin view of the Section 9.5 follow-up: schedule, recipient, the generated questions (editable
 * until the partner answers), dispatch history and the partner's answers. Mounted under the
 * Sustainability section of the report dossier.
 */

type Question = {
    id: string;
    activityTitle: string;
    questionText: string;
    countLabel: string | null;
    include: boolean;
    reason: string;
    sourceFieldIds: string[];
    generatedBy: string;
};
type Dispatch = { id: string; kind: string; status: string; attempts: number; scheduledFor: string; sentAt: string | null; recipientEmail: string; error: string; deliveryStatus?: string; deliveryDetail?: string };
type AuditEntry = { id: string; action: string; user?: string | null; created_at?: string; createdAt?: string; target?: string | null };
type Answer = { questionId: string; choice: string; numericValue: string | null; note: string };
type FollowUpView = {
    followUp: {
        id: string;
        status: string;
        recipientName: string;
        recipientEmail: string;
        recipientRole: string;
        dueDate: string;
        intervalLabel: string;
        tokenExpiresAt: string | null;
        questionSetVersion: number;
        questionsEditedAt: string | null;
        checkFocus: string;
        respondedAt: string | null;
        respondentName: string;
        generalComment: string;
        declinedAt: string | null;
        declineReason: string;
        reviewedAt: string | null;
        cancelledAt: string | null;
        cancelReason: string;
        lastError: string;
        decidedByAdmin?: boolean;
    } | null;
    plan: string;
    canActivate: boolean;
    dispatchEnabled: boolean;
    questions?: Question[];
    dispatches?: Dispatch[];
    answers?: Answer[];
    schedule?: { initial: string; reminder1: string; reminder2: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
    scheduled: "Scheduled · waiting for the due date",
    sent: "Email sent · awaiting response",
    reminded: "Reminder sent · awaiting response",
    responded: "Partner responded",
    declined: "Declined / wrong contact",
    expired: "Expired · no response",
    cancelled: "Cancelled",
    needs_attention: "Needs attention",
};

const CHOICE_LABEL: Record<string, string> = { yes: "Yes", partially: "Partially", no: "No", unable_to_verify: "Unable to verify" };
const KIND_LABEL: Record<string, string> = { initial: "Initial email", reminder1: "Reminder 1", reminder2: "Final reminder", manual: "Sent by admin" };

function pretty(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

/** CIEL PK names (or replaces) the responsible contact: 9.5 "Not decided yet", a bounce, or an opt-out. */
function RetargetForm({ onSubmit, busy, initialRole }: { onSubmit: (body: Record<string, string | undefined>) => Promise<void>; busy: boolean; initialRole?: string }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState(initialRole || "Partner / NGO representative");
    const [due, setDue] = useState("");
    return (
        <div className="grid gap-2 rounded-xl border border-[#d9e8e5] bg-white p-3 sm:grid-cols-2" data-testid="followup-retarget">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Responsible person's name" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                {["Partner / NGO representative", "Faculty supervisor", "School / host representative", "Student team lead", "University coordinator", "Other"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>
            <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" title="Follow-up date (defaults to the student's date or today)" />
            <div className="sm:col-span-2">
                <button
                    type="button"
                    disabled={busy || !name.trim() || !email.trim()}
                    onClick={() => void onSubmit({ recipientName: name.trim(), recipientEmail: email.trim(), recipientRole: role, dueDate: due || undefined })}
                    className="rounded-full bg-[#0c746e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                    {busy ? "Scheduling…" : "Schedule follow-up with this contact"}
                </button>
            </div>
        </div>
    );
}

export default function AdminReportFollowUpCard({ reportId }: { reportId: string }) {
    const [view, setView] = useState<FollowUpView | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [draft, setDraft] = useState<Question[]>([]);
    const [editing, setEditing] = useState(false);
    const [retarget, setRetarget] = useState(false);
    const [audit, setAudit] = useState<AuditEntry[] | null>(null);

    const base = `/api/v1/admin/reports/${encodeURIComponent(reportId)}/followup`;

    const loadAudit = async () => {
        if (audit) {
            setAudit(null);
            return;
        }
        const res = await authenticatedFetch(`${base}/audit`);
        if (!res || !res.ok) {
            toast.error("Could not load the audit trail");
            return;
        }
        const body = (await res.json()) as { logs: AuditEntry[] };
        setAudit(body.logs || []);
    };

    const load = useCallback(async () => {
        try {
            const res = await authenticatedFetch(base);
            if (!res || !res.ok) {
                setView(null);
                return;
            }
            const body = (await res.json()) as FollowUpView;
            setView(body);
            setDraft(body.questions || []);
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => {
        void load();
    }, [load]);

    const act = async (path: string, label: string, init?: RequestInit) => {
        setBusy(label);
        try {
            const res = await authenticatedFetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, ...init });
            if (!res || !res.ok) {
                toast.error(res ? await readError(res, `${label} failed`) : `${label} failed`);
                return;
            }
            const body = (await res.json()) as FollowUpView;
            setView(body);
            setDraft(body.questions || []);
            setEditing(false);
            toast.success(`${label}: done`);
        } finally {
            setBusy(null);
        }
    };

    const saveQuestions = async () => {
        setBusy("Save questions");
        try {
            const res = await authenticatedFetch(`${base}/questions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questions: draft.map((q) => ({
                        id: q.id && !q.id.startsWith("new-") ? q.id : undefined,
                        questionText: q.questionText,
                        activityTitle: q.activityTitle,
                        countLabel: q.countLabel || undefined,
                        include: q.include,
                    })),
                }),
            });
            if (!res || !res.ok) {
                toast.error(res ? await readError(res, "Could not save the questions") : "Could not save the questions");
                return;
            }
            const body = (await res.json()) as FollowUpView;
            setView(body);
            setDraft(body.questions || []);
            setEditing(false);
            toast.success("Questions saved");
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <p className="text-xs text-slate-500">Loading follow-up…</p>;
    if (!view) return null;

    const fu = view.followUp;
    const shell = "rounded-2xl border border-[#d9e8e5] bg-[#f5fbfa] p-4 space-y-3";
    const btn = "rounded-full border border-[#0c746e] bg-white px-3 py-1.5 text-xs font-bold text-[#0c746e] disabled:opacity-50";
    const btnPrimary = "rounded-full bg-[#0c746e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50";

    if (!fu) {
        return (
            <div className={shell} data-testid="admin-followup-card">
                <p className="text-sm font-bold text-slate-900">9.5 Follow-up email · not activated</p>
                <p className="text-xs text-slate-600">
                    {view.plan === "yes"
                        ? view.canActivate
                            ? "The student planned a follow-up check. It activates automatically when the report is published; you can also activate it now."
                            : "The student planned a follow-up check. It activates when this report is published."
                        : view.plan === "no"
                          ? "The student chose not to plan a follow-up check (allowed; recorded as Not planned)."
                          : view.plan === "later"
                            ? "The student left the follow-up decision to CIEL PK. Name the responsible contact below to start one, or leave it."
                            : "No follow-up answer was recorded in 9.5."}
                </p>
                {view.canActivate ? (
                    <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => void act("/activate", "Activate follow-up")}>
                        Activate follow-up now
                    </button>
                ) : null}
                {view.plan !== "yes" ? (
                    <RetargetForm
                        busy={busy !== null}
                        onSubmit={(body) => act("/activate", "Schedule follow-up", { body: JSON.stringify(body) })}
                    />
                ) : null}
            </div>
        );
    }

    const answerFor = (questionId: string) => (view.answers || []).find((a) => a.questionId === questionId);
    const editable = !["responded", "declined"].includes(fu.status);
    const mailable = ["scheduled", "sent", "reminded"].includes(fu.status);

    return (
        <div className={shell} data-testid="admin-followup-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-bold text-slate-900">9.5 Follow-up email · {STATUS_LABEL[fu.status] || fu.status}</p>
                    <p className="text-xs text-slate-600">
                        To {fu.recipientName || "—"}{fu.recipientRole ? ` (${fu.recipientRole})` : ""} · {fu.recipientEmail || "no email"} · {fu.intervalLabel}{fu.decidedByAdmin ? " · contact set by CIEL PK" : ""}
                    </p>
                    {view.schedule ? (
                        <p className="text-xs text-slate-600">
                            Initial {pretty(view.schedule.initial)} · Reminder {pretty(view.schedule.reminder1)} · Final {pretty(view.schedule.reminder2)} · Link valid until {pretty(fu.tokenExpiresAt)}
                        </p>
                    ) : null}
                    {!view.dispatchEnabled ? <p className="text-xs font-semibold text-amber-700">Automatic sending is paused (FOLLOWUP_DISPATCH_ENABLED=false).</p> : null}
                    {fu.status === "needs_attention" && fu.lastError ? <p className="text-xs font-semibold text-rose-700">{fu.lastError}</p> : null}
                    {fu.status === "cancelled" ? <p className="text-xs text-slate-500">Reason: {fu.cancelReason || "—"}</p> : null}
                    {fu.status === "declined" ? <p className="text-xs text-slate-500">Declined {pretty(fu.declinedAt)}{fu.declineReason ? ` · ${fu.declineReason}` : ""}</p> : null}
                    {fu.checkFocus ? <p className="mt-1 text-xs text-slate-600"><b>Student asked to check:</b> {fu.checkFocus}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    {fu.status === "needs_attention" || fu.status === "cancelled" ? (
                        <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => void act("/activate", "Re-activate")}>Re-activate</button>
                    ) : null}
                    {mailable ? (
                        <button type="button" className={btn} disabled={busy !== null} onClick={() => { if (window.confirm("Send the follow-up email to the partner now?")) void act("/send-now", "Send now"); }}>Send email now</button>
                    ) : null}
                    {mailable || fu.status === "needs_attention" ? (
                        <button
                            type="button"
                            className="rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                            disabled={busy !== null}
                            onClick={() => {
                                const reason = window.prompt("Cancel this follow-up? Reason (optional):") ?? null;
                                if (reason !== null) void act("/cancel", "Cancel follow-up", { body: JSON.stringify({ reason: reason || undefined }) });
                            }}
                        >
                            Cancel
                        </button>
                    ) : null}
                    {fu.status === "responded" && !fu.reviewedAt ? (
                        <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => void act("/mark-reviewed", "Mark reviewed")}>Mark reviewed · share with student</button>
                    ) : null}
                    {mailable || fu.status === "needs_attention" || fu.status === "declined" || fu.status === "expired" ? (
                        <button type="button" className={btn} disabled={busy !== null} onClick={() => setRetarget((v) => !v)}>{retarget ? "Close" : "Change contact"}</button>
                    ) : null}
                    <button type="button" className={btn} disabled={busy !== null} onClick={() => void loadAudit()}>{audit ? "Hide audit trail" : "Audit trail"}</button>
                </div>
            </div>
            {retarget ? (
                <RetargetForm
                    busy={busy !== null}
                    initialRole={fu.recipientRole}
                    onSubmit={async (body) => {
                        await act("/activate", "Change contact", { body: JSON.stringify(body) });
                        setRetarget(false);
                    }}
                />
            ) : null}
            {audit ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Audit trail</p>
                    {audit.length ? (
                        <ul className="mt-1 space-y-1 text-xs text-slate-700">
                            {audit.map((a) => (
                                <li key={a.id}>{pretty(a.created_at || a.createdAt)} · {a.action}{a.user ? ` · ${a.user}` : ""}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-500">No entries yet.</p>
                    )}
                </div>
            ) : null}

            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Questions · set v{fu.questionSetVersion}{fu.questionsEditedAt ? " · edited by admin" : " · generated"}</p>
                    {editable ? (
                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => void saveQuestions()}>Save</button>
                                    <button type="button" className={btn} disabled={busy !== null} onClick={() => { setDraft(view.questions || []); setEditing(false); }}>Discard</button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className={btn} disabled={busy !== null} onClick={() => setEditing(true)}>Edit</button>
                                    <button type="button" className={btn} disabled={busy !== null} onClick={() => { if (window.confirm("Replace the questions with a fresh generated set?")) void act("/regenerate", "Regenerate questions"); }}>Regenerate</button>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
                {draft.map((q, i) => {
                    const a = answerFor(q.id);
                    return (
                        <div key={q.id} className={`rounded-xl border bg-white p-3 ${q.include ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
                            {editing ? (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input value={q.activityTitle} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, activityTitle: e.target.value } : x)))} className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" placeholder="Activity" />
                                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={q.include} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))} /> Include</label>
                                        <button type="button" className="text-xs font-bold text-rose-600" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>Remove</button>
                                    </div>
                                    <textarea value={q.questionText} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, questionText: e.target.value } : x)))} className="min-h-[56px] w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
                                    <input value={q.countLabel || ""} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, countLabel: e.target.value } : x)))} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs" placeholder="Optional count label (e.g. Trees still surviving)" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0c746e]">{i + 1}. {q.activityTitle}{q.include ? "" : " · not in email"}</p>
                                    <p className="text-sm text-slate-900">{q.questionText}</p>
                                    <p className="text-[11px] text-slate-500">{q.reason}{q.countLabel ? ` · count: ${q.countLabel}` : ""}{q.sourceFieldIds?.length ? ` · source: ${q.sourceFieldIds.join(", ")}` : ""}</p>
                                    {a ? (
                                        <p className="mt-1 rounded-lg bg-[#e6f6f4] px-2 py-1 text-xs text-slate-800">
                                            <b>Partner:</b> {CHOICE_LABEL[a.choice] || a.choice}{a.numericValue != null && a.numericValue !== "" ? ` · ${a.numericValue}` : ""}{a.note ? ` · ${a.note}` : ""}
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    );
                })}
                {editing ? (
                    <button type="button" className={btn} onClick={() => setDraft((d) => [...d, { id: `new-${Date.now()}`, activityTitle: "", questionText: "", countLabel: null, include: true, reason: "Added by CIEL PK admin", sourceFieldIds: [], generatedBy: "admin" }])}>
                        + Add question
                    </button>
                ) : null}
            </div>

            {fu.status === "responded" ? (
                <p className="text-xs text-slate-700">
                    <b>Answered by</b> {fu.respondentName || "—"} on {pretty(fu.respondedAt)}{fu.generalComment ? ` · "${fu.generalComment}"` : ""}{fu.reviewedAt ? ` · reviewed ${pretty(fu.reviewedAt)} and visible to the student` : " · not yet shared with the student"}
                </p>
            ) : null}

            {(view.dispatches || []).length ? (
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Emails</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700">
                        {(view.dispatches || []).map((d) => (
                            <li key={d.id}>
                                {KIND_LABEL[d.kind] || d.kind} · {d.status}{d.sentAt ? ` ${pretty(d.sentAt)}` : ` (planned ${pretty(d.scheduledFor)})`} · {d.recipientEmail}
                                {d.deliveryStatus && d.deliveryStatus !== "unknown" ? <span className={d.deliveryStatus === "delivered" ? " text-emerald-700" : " text-rose-700"}> · {d.deliveryStatus}{d.deliveryDetail ? ` (${d.deliveryDetail})` : ""}</span> : null}
                                {d.error ? ` · ${d.error}` : ""}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
