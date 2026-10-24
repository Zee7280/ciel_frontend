"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2, Search, X } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { downloadCsv } from "../_shared/csv";
import {
    apiMessages,
    quickWorkApi,
    type AdminQuickWorkDetail,
    type AdminQuickWorkFilters,
    type AdminQuickWorkList,
    type QuickWorkReviewBody,
} from "@/utils/quickWorkApi";
import { EMAIL_RE, formatHours, shortDate, STATUS_LABEL, type QuickWorkStatus } from "@/utils/quickWorkRules";
import {
    EvidenceGallery,
    QuickWorkModal,
    QuickWorkRecordDetails,
    QuickWorkStatusPill,
} from "@/components/ciel/community-service/quick-work/QuickWorkShared";

const PAGE_SIZE = 20;
const STATUS_TABS: { value: QuickWorkStatus | ""; label: string }[] = [
    { value: "", label: "All sent for review" },
    { value: "submitted", label: "Awaiting review" },
    { value: "changes", label: "Changes requested" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Not approved" },
    { value: "draft", label: "Drafts" },
];

const HISTORY_LABEL: Record<string, string> = {
    submitted: "Submitted",
    resubmitted: "Resubmitted",
    approved: "Approved by faculty",
    changes: "Faculty requested changes",
    rejected: "Declined by faculty",
    admin_approved: "Approved by CIEL PK admin",
    admin_changes: "CIEL PK admin requested changes",
    admin_rejected: "Declined by CIEL PK admin",
    admin_faculty_changed: "Reviewing faculty changed by CIEL PK admin",
};

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50";

function daysSince(iso: string | null): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
}

const dateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** CIEL PK admin oversight of Quick Community Work: every log, stuck reviews, faculty reassignment and export. */
export default function AdminQuickWorkPage() {
    const [filters, setFilters] = useState<AdminQuickWorkFilters>({ status: "", page: 1, limit: PAGE_SIZE });
    const [draft, setDraft] = useState({ search: "", university: "", from: "", to: "" });
    const [list, setList] = useState<AdminQuickWorkList | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(async (f: AdminQuickWorkFilters) => {
        setLoading(true);
        try {
            setList(await quickWorkApi.adminList(f));
            setLoadError(null);
        } catch (e) {
            setLoadError(apiMessages(e).join(" "));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(filters);
    }, [filters, load]);

    const applyText = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters((f) => ({ ...f, ...draft, page: 1 }));
    };
    const clearAll = () => {
        setDraft({ search: "", university: "", from: "", to: "" });
        setFilters({ status: "", page: 1, limit: PAGE_SIZE });
    };
    const hasTextFilters = Boolean(filters.search || filters.university || filters.from || filters.to);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const { rows, truncated } = await quickWorkApi.adminExport(filters);
            if (!rows.length) {
                toast.info("No logs match these filters.");
                return;
            }
            downloadCsv(`quick-community-work-${new Date().toISOString().slice(0, 10)}.csv`, [
                [
                    "Log ID",
                    "Activity",
                    "Status",
                    "Activity type",
                    "Activity date",
                    "University",
                    "Department",
                    "Venue",
                    "Faculty name",
                    "Faculty email",
                    "Student",
                    "Student email",
                    "Student ID",
                    "Role",
                    "Join status",
                    "Present",
                    "Arrival",
                    "Departure",
                    "Break (min)",
                    "Hours",
                    "Submitted at",
                    "Reviewed at",
                    "Review note",
                ],
                ...rows.map((r) => [
                    r.logId,
                    r.title,
                    STATUS_LABEL[r.status] ?? r.status,
                    r.activityType,
                    r.activityDate ?? "",
                    r.university,
                    r.department,
                    r.location,
                    r.facultyName,
                    r.facultyEmail,
                    r.studentName,
                    r.studentEmail,
                    r.studentId,
                    r.role,
                    r.joinStatus,
                    r.present ? "yes" : "no",
                    r.startTime ?? "",
                    r.endTime ?? "",
                    r.breakMinutes,
                    formatHours(r.minutes),
                    r.submittedAt ?? "",
                    r.reviewedAt ?? "",
                    r.reviewNote ?? "",
                ]),
            ]);
            if (truncated) toast.warning("Export stopped at 5,000 logs. Narrow the filters to export the rest.");
        } catch (e) {
            toast.error(apiMessages(e).join(" "));
        } finally {
            setExporting(false);
        }
    };

    const counts = list?.counts;
    const sentForReview = counts ? counts.submitted + counts.changes + counts.approved + counts.rejected : 0;
    const totalPages = list ? Math.max(1, Math.ceil(list.total / (list.limit || PAGE_SIZE))) : 1;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quick Community Work</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        Short activity logs students submit for faculty review. Change the reviewer of a stuck log, or review it here when its faculty
                        cannot. Only approved hours count.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void exportCsv()}
                    disabled={exporting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Awaiting review" value={counts ? String(counts.submitted) : "—"} tone="amber" />
                <Stat label="Approved logs" value={counts ? String(counts.approved) : "—"} tone="green" />
                <Stat label="Approved hours" value={list ? formatHours(list.approvedMinutes) : "—"} tone="green" />
                <Stat label="Sent for review" value={counts ? String(sentForReview) : "—"} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3" role="tablist" aria-label="Status">
                    {STATUS_TABS.map((t) => {
                        const active = (filters.status ?? "") === t.value;
                        const n = !counts ? null : t.value === "" ? sentForReview : counts[t.value];
                        return (
                            <button
                                key={t.value || "all"}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setFilters((f) => ({ ...f, status: t.value, page: 1 }))}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >
                                {t.label}
                                {n != null ? <span className="ml-1.5 opacity-70">{n}</span> : null}
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={applyText} className="grid grid-cols-1 gap-3 border-b border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_auto_auto]">
                    <label className="relative">
                        <span className="sr-only">Search</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            id="qwAdminSearch"
                            className={`${inputCls} pl-9`}
                            placeholder="Activity, student, student ID or faculty"
                            value={draft.search}
                            maxLength={120}
                            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                        />
                    </label>
                    <label>
                        <span className="sr-only">University</span>
                        <input
                            id="qwAdminUniversity"
                            className={inputCls}
                            placeholder="University"
                            value={draft.university}
                            maxLength={120}
                            onChange={(e) => setDraft((d) => ({ ...d, university: e.target.value }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        From
                        <input id="qwAdminFrom" type="date" className={inputCls} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        To
                        <input id="qwAdminTo" type="date" className={inputCls} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
                    </label>
                    <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                            Apply
                        </button>
                        {hasTextFilters ? (
                            <button type="button" onClick={clearAll} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                Clear
                            </button>
                        ) : null}
                    </div>
                </form>

                {loadError ? (
                    <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {loadError}{" "}
                        <button type="button" onClick={() => void load(filters)} className="font-semibold underline">
                            Try again
                        </button>
                    </div>
                ) : null}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Activity</th>
                                <th className="px-4 py-3">Lead student</th>
                                <th className="px-4 py-3">University</th>
                                <th className="px-4 py-3">Reviewing faculty</th>
                                <th className="px-4 py-3 text-right">Hours</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && !list ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                                    </td>
                                </tr>
                            ) : list && list.rows.length ? (
                                list.rows.map((r) => {
                                    const waiting = r.status === "submitted" ? daysSince(r.submittedAt) : null;
                                    const stuck = r.status === "submitted" && (!r.facultyHasAccount || (waiting ?? 0) >= 7);
                                    return (
                                        <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-900">{r.title || "Untitled activity"}</div>
                                                <div className="text-xs text-slate-500">
                                                    {shortDate(r.activityDate)} · {r.participantCount} participant{r.participantCount === 1 ? "" : "s"} · {r.evidenceCount} file
                                                    {r.evidenceCount === 1 ? "" : "s"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-800">{r.leadName || "—"}</div>
                                                <div className="break-all text-xs text-slate-500">{r.leadEmail}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{r.university || "—"}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-800">{r.facultyName || "—"}</div>
                                                <div className="break-all text-xs text-slate-500">{r.facultyEmail || "No faculty named"}</div>
                                                {stuck ? (
                                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                                        <AlertTriangle className="h-3 w-3" aria-hidden />
                                                        {!r.facultyHasAccount ? "No CIEL faculty account" : `Waiting ${waiting} days`}
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-slate-800">{formatHours(r.minutes)}</td>
                                            <td className="px-4 py-3">
                                                <QuickWorkStatusPill status={r.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{r.submittedAt ? shortDate(r.submittedAt.slice(0, 10)) : "—"}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                        No Quick Community Work logs match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {list ? (
                    <div className="border-t border-slate-100 p-3">
                        <PaginationControls
                            currentPage={list.page}
                            totalPages={totalPages}
                            totalItems={list.total}
                            itemsPerPage={list.limit}
                            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                        />
                    </div>
                ) : null}
            </div>

            {openId ? (
                <LogDetail
                    id={openId}
                    onClose={() => setOpenId(null)}
                    onChanged={() => void load(filters)}
                />
            ) : null}
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "green" }) {
    const color = tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-slate-900";
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
        </div>
    );
}

function LogDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
    const [log, setLog] = useState<AdminQuickWorkDetail | null>(null);
    const [error, setError] = useState<string[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [reviewer, setReviewer] = useState({ name: "", email: "", note: "" });
    const [decision, setDecision] = useState({ verified: false, note: "" });

    useEffect(() => {
        let cancelled = false;
        quickWorkApi
            .adminGet(id)
            .then((l) => {
                if (cancelled) return;
                setLog(l);
                setReviewer({ name: l.facultyName, email: l.facultyEmail, note: "" });
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(apiMessages(e));
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const run = async (key: string, fn: () => Promise<AdminQuickWorkDetail>, success: string) => {
        setBusy(key);
        setError([]);
        try {
            const next = await fn();
            setLog(next);
            setReviewer({ name: next.facultyName, email: next.facultyEmail, note: "" });
            setDecision({ verified: false, note: "" });
            toast.success(success);
            onChanged();
        } catch (e) {
            setError(apiMessages(e));
        } finally {
            setBusy(null);
        }
    };

    const reassign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!log) return;
        const email = reviewer.email.trim().toLowerCase();
        if (!reviewer.name.trim() || !EMAIL_RE.test(email)) return setError(["Enter the faculty member’s name and a valid email."]);
        void run(
            "reassign",
            () => quickWorkApi.adminReassign(log.id, { facultyName: reviewer.name.trim(), facultyEmail: email, note: reviewer.note.trim() || undefined }),
            log.status === "submitted" ? "Reviewer changed. They have been emailed the review request." : "Reviewer changed.",
        );
    };

    const review = (action: QuickWorkReviewBody["action"]) => {
        if (!log) return;
        if (action !== "approve" && !decision.note.trim()) return setError(["Add a brief reason for the student first."]);
        if (action === "approve" && !decision.verified) return setError(["Confirm you reviewed the attendance and evidence."]);
        void run(
            action,
            () => quickWorkApi.adminReview(log.id, { action, note: decision.note.trim() || undefined, verified: decision.verified }),
            action === "approve" ? "Approved. Each participant’s hours now count." : action === "changes" ? "Returned to the student for changes." : "Declined. No hours were credited.",
        );
    };

    const canReassign = log && log.status !== "approved" && log.status !== "rejected";

    return (
        <QuickWorkModal labelledBy="qwAdminDetailTitle" onClose={onClose} wide>
            <header className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 id="qwAdminDetailTitle" className="break-words text-lg font-bold text-slate-900">
                        {log ? log.title || "Untitled activity" : "Loading…"}
                    </h2>
                    {log ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <QuickWorkStatusPill status={log.status} />
                            <span>
                                {log.university || "University not set"} · {log.department || "Department not set"}
                            </span>
                        </div>
                    ) : null}
                </div>
                <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="h-6 w-6" />
                </button>
            </header>

            {error.length ? (
                <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <ul className="list-disc pl-4">
                        {error.map((x) => (
                            <li key={x}>{x}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {!log ? (
                error.length ? null : (
                    <div className="flex h-36 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                )
            ) : (
                <>
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            log.facultyAccount.exists && log.facultyAccount.authorisedUniversity ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"
                        }`}
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviewing faculty</p>
                        <p className="mt-1 text-slate-900">
                            <b>{log.facultyName || "No faculty named"}</b> <span className="break-all text-slate-600">{log.facultyEmail}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                            {!log.facultyAccount.exists
                                ? "This email has no CIEL faculty account, so nobody can review the log until it is changed."
                                : log.facultyAccount.authorisedUniversity
                                  ? `CIEL faculty account, authorised for ${log.facultyAccount.authorisedUniversity}.`
                                  : "CIEL faculty account, but not authorised for any university, so they cannot approve hours."}
                        </p>
                    </div>

                    <QuickWorkRecordDetails log={log} />
                    {log.evidence.length ? (
                        <details open className="my-2">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                Evidence ({log.evidence.length}) · {log.visibility}
                            </summary>
                            <EvidenceGallery evidence={log.evidence} />
                        </details>
                    ) : (
                        <p className="my-2 text-sm text-slate-500">No evidence attached.</p>
                    )}

                    {log.history.length ? (
                        <div className="mt-4">
                            <h3 className="mb-2 text-sm font-bold text-slate-900">History</h3>
                            <ol className="space-y-2 border-l border-slate-200 pl-4 text-sm">
                                {log.history.map((h, i) => (
                                    <li key={`${h.at}-${i}`}>
                                        <span className="font-semibold text-slate-800">{HISTORY_LABEL[h.action] ?? h.action.replace(/_/g, " ")}</span>
                                        <span className="text-slate-500">
                                            {" "}
                                            · {dateTime(h.at)}
                                            {h.byName ? ` · ${h.byName}` : ""}
                                        </span>
                                        {h.note ? <p className="text-xs text-slate-600">{h.note}</p> : null}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ) : null}

                    {canReassign ? (
                        <form onSubmit={reassign} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-bold text-slate-900">Change reviewing faculty</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="text-xs font-semibold text-slate-600">
                                    Faculty name
                                    <input
                                        id="qwAdminFacultyName"
                                        className={`${inputCls} mt-1`}
                                        maxLength={100}
                                        value={reviewer.name}
                                        onChange={(e) => setReviewer((r) => ({ ...r, name: e.target.value }))}
                                    />
                                </label>
                                <label className="text-xs font-semibold text-slate-600">
                                    Faculty email
                                    <input
                                        id="qwAdminFacultyEmail"
                                        type="email"
                                        className={`${inputCls} mt-1`}
                                        maxLength={120}
                                        value={reviewer.email}
                                        onChange={(e) => setReviewer((r) => ({ ...r, email: e.target.value }))}
                                    />
                                </label>
                            </div>
                            <label className="block text-xs font-semibold text-slate-600">
                                Reason <span className="font-normal text-slate-400">(optional, kept in the history)</span>
                                <input
                                    id="qwAdminFacultyNote"
                                    className={`${inputCls} mt-1`}
                                    maxLength={300}
                                    placeholder="e.g. Student typed a wrong email"
                                    value={reviewer.note}
                                    onChange={(e) => setReviewer((r) => ({ ...r, note: e.target.value }))}
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={busy != null}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                {busy === "reassign" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Save reviewer
                            </button>
                        </form>
                    ) : null}

                    {log.status === "submitted" ? (
                        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                            <h3 className="text-sm font-bold text-slate-900">CIEL PK decision</h3>
                            <p className="text-xs text-slate-500">Use this when the faculty member cannot review the log. The decision is recorded as yours.</p>
                            <label className="flex items-start gap-2.5 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 flex-none"
                                    checked={decision.verified}
                                    onChange={(e) => setDecision((d) => ({ ...d, verified: e.target.checked }))}
                                />
                                <span>I have reviewed the evidence and each participant’s attendance.</span>
                            </label>
                            <label className="block text-xs font-semibold text-slate-600">
                                Note to the student <span className="font-normal text-slate-400">(required to return or decline)</span>
                                <input
                                    id="qwAdminDecisionNote"
                                    className={`${inputCls} mt-1`}
                                    maxLength={300}
                                    value={decision.note}
                                    onChange={(e) => setDecision((d) => ({ ...d, note: e.target.value }))}
                                />
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={busy != null}
                                    onClick={() => review("approve")}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#0e7d74] px-4 py-2 text-sm font-bold text-white hover:bg-[#0b6760] disabled:opacity-60"
                                >
                                    {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Approve hours
                                </button>
                                <button
                                    type="button"
                                    disabled={busy != null}
                                    onClick={() => review("changes")}
                                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Request changes
                                </button>
                                <button
                                    type="button"
                                    disabled={busy != null}
                                    onClick={() => review("reject")}
                                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </QuickWorkModal>
    );
}
