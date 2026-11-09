"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authenticatedFetch } from "@/utils/api";

/**
 * Section 9.5 follow-up tracker across every published report: who was asked, what went out,
 * what came back (per-question outcomes rolled up), what needs CIEL PK's attention, and the
 * "Not decided yet" reports waiting for a contact. CSV export carries the same rows.
 */

type Outcome = { bucket: string; yes: number; partially: number; no: number; unable: number; answered: number };
type Row = {
    id: string;
    reportId: string;
    reportPublicId: string;
    projectTitle: string;
    studentName: string;
    recipientName: string;
    recipientEmail: string;
    recipientRole: string;
    status: string;
    decidedByAdmin: boolean;
    dueDate: string;
    emailsSent: number;
    lastSentAt: string | null;
    lastDelivery: string;
    respondedAt: string | null;
    reviewedAt: string | null;
    lastError: string;
    outcome: Outcome;
};
type Pending = { reportId: string; reportPublicId: string; projectTitle: string; studentName: string; decisionOwner: string; publishedAt: string | null };
type OptOut = { id: string; email: string; source: string; reason: string; createdAt: string };
type ListView = {
    rows: Row[];
    total: number;
    page: number;
    limit: number;
    stats: { byStatus: Record<string, number>; byOutcome: Record<string, number>; awaiting: number; pendingDecisions: number; dispatchEnabled: boolean; optOuts?: number };
    pendingDecisions: Pending[];
    optOuts?: OptOut[];
};
const OPT_OUT_SOURCE: Record<string, string> = { partner_opt_out: "Asked to stop", webhook_bounce: "Hard bounce", webhook_complaint: "Spam complaint", admin: "Added by admin" };

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "scheduled", label: "Scheduled" },
    { key: "awaiting", label: "Awaiting response" },
    { key: "responded", label: "Responded" },
    { key: "needs_attention", label: "Needs attention" },
    { key: "declined", label: "Declined" },
    { key: "expired", label: "No response" },
    { key: "cancelled", label: "Cancelled" },
];

const STATUS_LABEL: Record<string, string> = {
    scheduled: "Scheduled",
    sent: "Email sent",
    reminded: "Reminded",
    responded: "Responded",
    declined: "Declined",
    expired: "No response",
    cancelled: "Cancelled",
    needs_attention: "Needs attention",
};
const STATUS_TONE: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    sent: "bg-sky-100 text-sky-800",
    reminded: "bg-sky-100 text-sky-800",
    responded: "bg-emerald-100 text-emerald-800",
    declined: "bg-rose-100 text-rose-800",
    expired: "bg-amber-100 text-amber-800",
    cancelled: "bg-slate-100 text-slate-500",
    needs_attention: "bg-rose-100 text-rose-800",
};
const OUTCOME_LABEL: Record<string, string> = {
    continuing: "Continuing",
    partially_continuing: "Partially continuing",
    stopped: "Stopped",
    unable_to_verify: "Unable to verify",
    mixed: "Mixed",
    no_response: "No response",
};
const OUTCOME_TONE: Record<string, string> = {
    continuing: "text-emerald-700",
    partially_continuing: "text-amber-700",
    stopped: "text-rose-700",
    unable_to_verify: "text-slate-500",
    mixed: "text-amber-700",
    no_response: "text-slate-400",
};
const DECISION_OWNER: Record<string, string> = { faculty: "Faculty supervisor", coordinator: "University coordinator", admin: "CIEL PK Admin" };

function pretty(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { message?: unknown };
        const m = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
        return typeof m === "string" && m.trim() ? m : fallback;
    } catch {
        return fallback;
    }
}

function StartFollowUpForm({ pending, onDone }: { pending: Pending; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Partner / NGO representative");
    const [due, setDue] = useState("");
    const [busy, setBusy] = useState(false);

    const start = async () => {
        setBusy(true);
        try {
            const res = await authenticatedFetch(`/api/v1/admin/reports/${encodeURIComponent(pending.reportId)}/followup/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipientName: name.trim(), recipientEmail: email.trim(), recipientRole: role, dueDate: due || undefined }),
            });
            if (!res || !res.ok) {
                toast.error(res ? await readError(res, "Could not start the follow-up") : "Could not start the follow-up");
                return;
            }
            toast.success("Follow-up scheduled");
            setOpen(false);
            onDone();
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button type="button" className="rounded-full bg-[#0c746e] px-3 py-1.5 text-xs font-bold text-white" onClick={() => setOpen(true)}>
                Name a contact & start
            </button>
        );
    }
    return (
        <div className="mt-2 grid gap-2 rounded-xl border border-[#d9e8e5] bg-white p-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Responsible person's name" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                {["Partner / NGO representative", "Faculty supervisor", "School / host representative", "Student team lead", "University coordinator", "Other"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>
            <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" title="Follow-up date (defaults to today)" />
            <div className="flex gap-2 sm:col-span-2">
                <button type="button" disabled={busy || !name.trim() || !email.trim()} onClick={() => void start()} className="rounded-full bg-[#0c746e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {busy ? "Starting…" : "Schedule follow-up"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">Cancel</button>
            </div>
        </div>
    );
}

export default function AdminFollowUpsPage() {
    const [view, setView] = useState<ListView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ status, page: String(page), limit: "25" });
            if (search.trim()) params.set("q", search.trim());
            const res = await authenticatedFetch(`/api/v1/admin/followups?${params.toString()}`);
            if (!res || !res.ok) {
                setError(res ? await readError(res, "Could not load the follow-up tracker.") : "Could not load the follow-up tracker.");
                return;
            }
            setView((await res.json()) as ListView);
        } catch {
            setError("Could not load the follow-up tracker.");
        } finally {
            setLoading(false);
        }
    }, [status, search, page]);

    useEffect(() => {
        void load();
    }, [load]);

    const exportCsv = async () => {
        const params = new URLSearchParams({ status });
        if (search.trim()) params.set("q", search.trim());
        const res = await authenticatedFetch(`/api/v1/admin/followups/export.csv?${params.toString()}`);
        if (!res || !res.ok) {
            toast.error("Export failed");
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ciel-pk-follow-ups-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const stats = view?.stats;
    const byStatus = stats?.byStatus || {};
    const byOutcome = stats?.byOutcome || {};
    const pageCount = view ? Math.max(1, Math.ceil(view.total / view.limit)) : 1;

    return (
        <div className="min-w-0 space-y-6 p-0 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Follow-up tracker</h1>
                    <p className="text-slate-500">Section 9.5 partner verification after publication: emails, answers and what still needs a decision.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    <button type="button" onClick={() => void exportCsv()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0c746e] px-4 text-sm font-semibold text-white shadow-sm">
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                </div>
            </div>

            {stats && !stats.dispatchEnabled ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">Automatic sending is paused (FOLLOWUP_DISPATCH_ENABLED=false). Follow-ups still schedule; nothing is mailed.</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {[
                    ["Scheduled", byStatus.scheduled || 0],
                    ["Awaiting response", stats?.awaiting || 0],
                    ["Responded", byStatus.responded || 0],
                    ["Needs attention", byStatus.needs_attention || 0],
                    ["Declined", byStatus.declined || 0],
                    ["No response", byStatus.expired || 0],
                    ["Cancelled", byStatus.cancelled || 0],
                    ["Decisions pending", stats?.pendingDecisions || 0],
                ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
                        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Partner-reported outcomes (responded follow-ups)</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {Object.entries(OUTCOME_LABEL).map(([key, label]) => (
                        <span key={key} className={`font-semibold ${OUTCOME_TONE[key]}`}>{label}: {byOutcome[key] || 0}</span>
                    ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">“No response” is never counted as a negative result.</p>
            </div>

            {view?.pendingDecisions.length ? (
                <div className="rounded-2xl border border-[#d9e8e5] bg-[#f5fbfa] p-4">
                    <p className="text-sm font-bold text-slate-900">Decisions pending · {view.pendingDecisions.length}</p>
                    <p className="text-xs text-slate-600">These students answered “Not decided yet” in 9.5. Name the responsible contact to start the follow-up, or leave it.</p>
                    <ul className="mt-3 space-y-3">
                        {view.pendingDecisions.map((p) => (
                            <li key={p.reportId} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <Link href={`/dashboard/admin/reports/verify/${p.reportId}`} className="text-sm font-bold text-[#0c746e] underline">{p.projectTitle || p.reportPublicId || p.reportId}</Link>
                                        <p className="text-xs text-slate-500">{p.studentName || "Student"} · suggested decider: {DECISION_OWNER[p.decisionOwner] || p.decisionOwner} · published {pretty(p.publishedAt)}</p>
                                    </div>
                                    <StartFollowUpForm pending={p} onDone={() => void load()} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {view?.optOuts?.length ? (
                <details className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900">Do-not-email list · {view.optOuts.length}</summary>
                    <p className="mt-1 text-xs text-slate-600">Addresses that asked to stop, hard-bounced or complained. Remove one only if the person confirmed they want follow-ups again.</p>
                    <ul className="mt-2 space-y-1">
                        {view.optOuts.map((o) => (
                            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-700">
                                <span><b>{o.email}</b> · {OPT_OUT_SOURCE[o.source] || o.source}{o.reason ? ` · ${o.reason}` : ""} · {pretty(o.createdAt)}</span>
                                <button
                                    type="button"
                                    className="rounded-full border border-rose-300 px-2 py-0.5 font-bold text-rose-700"
                                    onClick={async () => {
                                        if (!window.confirm(`Allow CIEL PK follow-up emails to ${o.email} again?`)) return;
                                        const res = await authenticatedFetch(`/api/v1/admin/followups/opt-outs/${encodeURIComponent(o.email)}`, { method: "DELETE" });
                                        if (!res || !res.ok) {
                                            toast.error(res ? await readError(res, "Could not remove") : "Could not remove");
                                            return;
                                        }
                                        toast.success("Removed from the do-not-email list");
                                        void load();
                                    }}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => { setStatus(f.key); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === f.key ? "border-[#0c746e] bg-[#0c746e] text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                        {f.label}
                    </button>
                ))}
                <form
                    className="ml-auto flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setPage(1);
                        setSearch(q);
                    }}
                >
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project, student, recipient, report id" className="w-64 rounded-xl border border-slate-200 px-3 py-1.5 text-sm" />
                    <button type="submit" className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">Search</button>
                </form>
            </div>

            {error ? (
                <div role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                            <th className="px-3 py-2">Project · student</th>
                            <th className="px-3 py-2">Recipient</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Due</th>
                            <th className="px-3 py-2">Emails</th>
                            <th className="px-3 py-2">Outcome</th>
                            <th className="px-3 py-2">Reviewed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
                        ) : !view || view.rows.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-slate-500">No follow-ups match.</td></tr>
                        ) : (
                            view.rows.map((r) => (
                                <tr key={r.id} className="align-top">
                                    <td className="px-3 py-2">
                                        <Link href={`/dashboard/admin/reports/verify/${r.reportId}`} className="font-bold text-[#0c746e] underline">{r.projectTitle || r.reportPublicId || r.reportId}</Link>
                                        <div className="text-xs text-slate-500">{r.reportPublicId ? `${r.reportPublicId} · ` : ""}{r.studentName || "Student"}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-semibold text-slate-900">{r.recipientName || "—"}</div>
                                        <div className="text-xs text-slate-500">{r.recipientEmail}{r.recipientRole ? ` · ${r.recipientRole}` : ""}{r.decidedByAdmin ? " · set by CIEL PK" : ""}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[r.status] || "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[r.status] || r.status}</span>
                                        {r.lastError ? <div className="mt-1 max-w-[260px] text-xs text-rose-700">{r.lastError}</div> : null}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">{pretty(r.dueDate)}</td>
                                    <td className="px-3 py-2 text-slate-700">
                                        {r.emailsSent}{r.lastSentAt ? ` · last ${pretty(r.lastSentAt)}` : ""}
                                        {r.emailsSent ? <div className="text-xs text-slate-500">delivery: {r.lastDelivery}</div> : null}
                                    </td>
                                    <td className={`px-3 py-2 font-semibold ${OUTCOME_TONE[r.outcome.bucket] || ""}`}>
                                        {OUTCOME_LABEL[r.outcome.bucket] || r.outcome.bucket}
                                        {r.outcome.answered ? <div className="text-xs font-normal text-slate-500">Y {r.outcome.yes} · P {r.outcome.partially} · N {r.outcome.no} · ? {r.outcome.unable}</div> : null}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">{r.respondedAt ? (r.reviewedAt ? pretty(r.reviewedAt) : "Pending review") : "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {view && pageCount > 1 ? (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Previous</button>
                    <span className="text-slate-500">Page {view.page} of {pageCount} · {view.total} follow-ups</span>
                    <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
                </div>
            ) : null}
        </div>
    );
}
