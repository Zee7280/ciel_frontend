"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Clock, GraduationCap, Loader2, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/utils/api";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AgingChip from "@/components/admin/AgingChip";
import { readErrorMessage } from "@/components/admin/useAbortableFetch";
import { formatAdminDateTime } from "@/utils/adminDate";
import { Button } from "@/app/dashboard/student/report/components/ui/button";
import { Badge } from "@/app/dashboard/student/report/components/ui/badge";
import { Card } from "@/app/dashboard/student/report/components/ui/card";
import { Textarea } from "@/app/dashboard/student/report/components/ui/textarea";
import { toast } from "sonner";
import {
    ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER,
    extractOpportunityApplicationsArray,
    mapOpportunityApplicationListRow,
    type OpportunityApplicationListRow,
} from "@/utils/opportunityApplicationsAdmin";
import { formatDisplayId } from "@/utils/displayIds";

type DecisionMeta = { decidedAt?: string; decidedBy?: string; comment?: string };
type ConfirmState = { kind: "approve" | "reject"; ids: string[] } | null;
type ResultLine = { id: string; label: string; ok: boolean; message: string };

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
}

function mapRows(payload: unknown, meta: Record<string, DecisionMeta>): OpportunityApplicationListRow[] {
    if (payload && typeof payload === "object" && (payload as Record<string, unknown>).success === false) return [];
    const out: OpportunityApplicationListRow[] = [];
    for (const raw of extractOpportunityApplicationsArray(payload)) {
        const row = mapOpportunityApplicationListRow(raw);
        if (!row) continue;
        const r = raw as Record<string, unknown>;
        const m: DecisionMeta = {
            decidedAt: pickStr(r, "admin_decided_at", "adminDecidedAt"),
            decidedBy: pickStr(r, "admin_decided_by", "adminDecidedBy"),
            comment: pickStr(r, "admin_comment", "adminComment"),
        };
        if (m.decidedAt || m.decidedBy || m.comment) meta[row.id] = m;
        out.push(row);
    }
    return out;
}

function hasFacultyData(r: OpportunityApplicationListRow): boolean {
    return !!(r.facultyApprovedAt || r.facultyReviewerName || r.facultyApprovalStatus);
}

export default function AdminJoinApplicationsPage() {
    const [tab, setTab] = useState<"pending" | "history">("pending");
    const [pendingRows, setPendingRows] = useState<OpportunityApplicationListRow[]>([]);
    const [historyRows, setHistoryRows] = useState<OpportunityApplicationListRow[]>([]);
    const [meta, setMeta] = useState<Record<string, DecisionMeta>>({});
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirm, setConfirm] = useState<ConfirmState>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState<ResultLine[] | null>(null);
    const loadSeq = useRef(0);

    const loadLists = useCallback(async () => {
        const seq = ++loadSeq.current;
        setIsLoading(true);
        try {
            const nextMeta: Record<string, DecisionMeta> = {};
            const pendingRes = await authenticatedFetch(`/api/v1/admin/applications?status=pending`);
            if (seq !== loadSeq.current) return;
            let pending: OpportunityApplicationListRow[] = [];
            if (pendingRes?.ok) {
                pending = mapRows(await pendingRes.json(), nextMeta);
            } else {
                toast.error("Could not load admin join queue");
            }

            let history: OpportunityApplicationListRow[] = [];
            let matched: string | null = null;
            for (const status of ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER) {
                const res = await authenticatedFetch(`/api/v1/admin/applications?status=${encodeURIComponent(status)}`);
                if (seq !== loadSeq.current) return;
                if (res?.ok) {
                    history = mapRows(await res.json(), nextMeta);
                    matched = status;
                    break;
                }
            }
            if (seq !== loadSeq.current) return;
            setPendingRows(pending);
            setHistoryRows(history);
            setMeta(nextMeta);
            setHistoryLoadError(
                pendingRes?.ok && matched === null
                    ? `History could not be loaded. Tried status=${ADMIN_APPLICATIONS_HISTORY_STATUS_TRY_ORDER.join(", ")} — align GET /admin/applications with one of these (or implement on the server).`
                    : null,
            );
        } catch (e) {
            console.error(e);
            if (seq === loadSeq.current) toast.error("Failed to load applications");
        } finally {
            if (seq === loadSeq.current) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLists();
    }, [loadLists]);

    useEffect(() => {
        setSelected(new Set());
    }, [tab]);

    const visible = tab === "pending" ? pendingRows : historyRows;
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visible;
        return visible.filter((r) => {
            const teamHay = (r.teamMembers ?? []).map((m) => `${m.name} ${m.email}`).join(" ");
            return [
                r.opportunityTitle,
                r.studentName,
                r.studentEmail,
                r.status,
                r.id,
                r.applicationStage,
                r.facultyReviewerName,
                r.primaryFacultyEmail,
                r.facultyApprovalStatus,
                teamHay,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [visible, search]);

    const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
    const allSelected = tab === "pending" && filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    const selectedIds = useMemo(() => pendingRows.filter((r) => selected.has(r.id)).map((r) => r.id), [pendingRows, selected]);

    const toggleOne = (id: string) =>
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filteredIds));

    const openConfirm = (kind: "approve" | "reject", ids: string[]) => {
        setRejectComment("");
        setConfirm({ kind, ids });
    };

    const rowLabel = (id: string) => {
        const r = pendingRows.find((x) => x.id === id);
        return r ? `${r.studentName} — ${r.opportunityTitle}` : id;
    };

    const runConfirm = async () => {
        if (!confirm) return;
        const { kind, ids } = confirm;
        const reason = rejectComment.trim();
        if (kind === "reject" && reason.length < 3) {
            toast.error("Please add feedback (at least 3 characters).");
            return;
        }
        setSubmitting(true);
        const lines: ResultLine[] = [];
        try {
            for (const id of ids) {
                const label = rowLabel(id);
                try {
                    const res = await authenticatedFetch(`/api/v1/admin/applications/${id}/${kind}`, {
                        method: "POST",
                        ...(kind === "reject" ? { body: JSON.stringify({ reason }) } : {}),
                    });
                    if (res?.ok) {
                        lines.push({ id, label, ok: true, message: kind === "approve" ? "Approved" : "Rejected" });
                    } else {
                        lines.push({ id, label, ok: false, message: await readErrorMessage(res, `Failed to ${kind}`) });
                    }
                } catch {
                    lines.push({ id, label, ok: false, message: "Error connecting to server" });
                }
            }
        } finally {
            setSubmitting(false);
        }
        const okIds = new Set(lines.filter((l) => l.ok).map((l) => l.id));
        setPendingRows((prev) => prev.filter((r) => !okIds.has(r.id)));
        setSelected((prev) => new Set([...prev].filter((id) => !okIds.has(id))));
        setConfirm(null);
        if (ids.length === 1) {
            if (lines[0].ok) {
                toast.success(kind === "approve" ? "Application approved — student can be enrolled for reporting." : "Application rejected");
            } else {
                toast.error(lines[0].message);
            }
        } else {
            setResults(lines);
        }
        void loadLists();
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Join applications (CIEL)</h1>
                <p className="text-slate-500 max-w-3xl">
                    Final queue for students who applied to partner opportunities (after faculty where required). Approving
                    here should create enrollment / participation so the student can open their report. This is separate from
                    the legacy{" "}
                    <Link href="/dashboard/admin/approvals" className="text-blue-600 font-medium hover:underline">
                        Approvals
                    </Link>{" "}
                    screen for other workflows.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={tab === "pending" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("pending")}>
                    Pending
                    <span className="ml-2 rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">{pendingRows.length}</span>
                </Button>
                <Button variant={tab === "history" ? "default" : "outline"} size="sm" className="h-9" onClick={() => setTab("history")}>
                    History
                    <span className="ml-2 rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">{historyRows.length}</span>
                </Button>
            </div>

            {tab === "history" && historyLoadError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {historyLoadError}
                </div>
            ) : null}

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student, email, opportunity…"
                    aria-label="Search applications"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {tab === "pending" && filtered.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={toggleAll} />
                        Select all shown ({filtered.length})
                        {selectedIds.length > 0 ? <span className="text-slate-500">· {selectedIds.length} selected</span> : null}
                    </label>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="h-9 flex-1 bg-green-600 hover:bg-green-700 sm:flex-none"
                            disabled={selectedIds.length === 0}
                            onClick={() => openConfirm("approve", selectedIds)}
                        >
                            Approve selected
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-9 flex-1 sm:flex-none"
                            disabled={selectedIds.length === 0}
                            onClick={() => openConfirm("reject", selectedIds)}
                        >
                            Reject selected
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <h3 className="text-lg font-bold text-slate-900">{tab === "pending" ? "Queue is empty" : "No history yet"}</h3>
                        <p className="text-slate-500">
                            After faculty approves, requests appear here in Pending for final CIEL action. History loads when the
                            API accepts a supported history filter.
                        </p>
                    </div>
                ) : (
                    filtered.map((row) => (
                        <Card key={row.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {tab === "pending" ? (
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                aria-label={`Select ${row.studentName}`}
                                                checked={selected.has(row.id)}
                                                onChange={() => toggleOne(row.id)}
                                            />
                                        ) : null}
                                        <h3 className="font-bold text-lg text-slate-900 break-words">{row.opportunityTitle}</h3>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                                            App {formatDisplayId(row.id, "APP")}
                                        </Badge>
                                        {tab === "pending" ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Clock className="w-3 h-3 mr-1" /> Pending admin
                                            </Badge>
                                        ) : null}
                                        {tab === "pending" ? (
                                            <AgingChip since={row.facultyApprovedAt || row.createdAt} />
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                                {row.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-slate-600 text-sm">
                                        <strong>{row.studentName}</strong>
                                        {row.studentEmail ? (
                                            <span className="break-all text-slate-500"> · {row.studentEmail}</span>
                                        ) : null}
                                        {row.participationType === "team" ? (
                                            <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                                                Team
                                            </span>
                                        ) : null}
                                    </p>
                                    {row.teamMembers && row.teamMembers.length > 0 ? (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                <Users className="h-3.5 w-3.5" aria-hidden />
                                                Teammates ({row.teamMembers.length})
                                            </p>
                                            <ul className="space-y-1 text-sm text-slate-700">
                                                {row.teamMembers.map((m, idx) => (
                                                    <li key={`${m.email}-${idx}`} className="break-words">
                                                        <strong className="text-slate-800">{m.name}</strong>
                                                        <span className="break-all text-slate-600"> · {m.email}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-2 text-xs text-slate-500">
                                                Applicant above is the team lead; listed peers are from the student&apos;s
                                                application.
                                            </p>
                                        </div>
                                    ) : null}
                                    <p className="text-xs text-slate-400 font-mono">Opportunity: {formatDisplayId(row.opportunityId, "OPP")}</p>

                                    {tab === "pending" && !hasFacultyData(row) ? (
                                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                            <Clock className="h-3.5 w-3.5" aria-hidden /> Pending admin review
                                            {row.createdAt ? ` · submitted ${formatAdminDateTime(row.createdAt)}` : ""}
                                        </p>
                                    ) : null}

                                    {tab === "history" && meta[row.id] ? (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-0.5">
                                            <p className="font-semibold text-slate-800">Admin decision</p>
                                            {meta[row.id].decidedBy ? <p>By: {meta[row.id].decidedBy}</p> : null}
                                            {meta[row.id].decidedAt ? <p>At: {formatAdminDateTime(meta[row.id].decidedAt)}</p> : null}
                                            {meta[row.id].comment ? <p className="break-words">Comment: {meta[row.id].comment}</p> : null}
                                        </div>
                                    ) : null}

                                    {tab === "pending" && hasFacultyData(row) ? (
                                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 space-y-1.5 text-xs text-emerald-950">
                                            <div className="flex items-start gap-2 font-semibold text-emerald-900">
                                                <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Faculty review complete — awaiting your final approval</span>
                                            </div>
                                            <p className="text-emerald-800/90 pl-6 leading-relaxed">
                                                This application already passed the faculty supervisor step and is in the CIEL admin
                                                queue only. Approving here should enroll the student for reporting.
                                            </p>
                                            {(row.applicationStage ||
                                                row.facultyApprovedAt ||
                                                row.facultyReviewerName ||
                                                row.facultyApprovalStatus ||
                                                row.primaryFacultyEmail) && (
                                                <ul className="pl-6 mt-1 space-y-0.5 text-emerald-900/85 font-medium list-disc list-inside">
                                                    {row.applicationStage ? (
                                                        <li>
                                                            Pipeline stage:{" "}
                                                            <span className="font-mono">{row.applicationStage}</span>
                                                        </li>
                                                    ) : null}
                                                    {row.facultyApprovalStatus ? (
                                                        <li>
                                                            Faculty status:{" "}
                                                            <span className="capitalize">{row.facultyApprovalStatus.replace(/_/g, " ")}</span>
                                                        </li>
                                                    ) : null}
                                                    {row.facultyReviewerName ? <li>Reviewer: {row.facultyReviewerName}</li> : null}
                                                    {row.facultyApprovedAt ? (
                                                        <li>
                                                            Faculty action at:{" "}
                                                            {formatAdminDateTime(row.facultyApprovedAt)}
                                                        </li>
                                                    ) : null}
                                                    {row.primaryFacultyEmail ? (
                                                        <li>Primary faculty email: {row.primaryFacultyEmail}</li>
                                                    ) : null}
                                                </ul>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex w-full flex-col justify-center gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row md:w-52 md:flex-col md:border-l md:border-t-0 md:p-6">
                                    {tab === "pending" ? (
                                        <>
                                            <Button
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                onClick={() => openConfirm("approve", [row.id])}
                                                disabled={submitting}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                            </Button>
                                            <Button variant="destructive" className="w-full" disabled={submitting} onClick={() => openConfirm("reject", [row.id])}>
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </>
                                    ) : null}
                                    <Link
                                        href="/dashboard/admin/projects"
                                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
                                    >
                                        Admin projects
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <ConfirmDialog
                open={confirm != null}
                title={
                    confirm
                        ? `${confirm.kind === "approve" ? "Approve" : "Reject"} ${
                              confirm.ids.length === 1 ? "application" : `${confirm.ids.length} applications`
                          }?`
                        : ""
                }
                description={
                    confirm
                        ? confirm.ids.length === 1
                            ? `${rowLabel(confirm.ids[0])}. The student is notified of the decision.`
                            : `Applied one by one; students are notified. A summary is shown afterwards.`
                        : undefined
                }
                variant={confirm?.kind === "reject" ? "danger" : "default"}
                confirmLabel={confirm?.kind === "reject" ? "Reject" : "Approve"}
                loading={submitting}
                confirmDisabled={confirm?.kind === "reject" && rejectComment.trim().length < 3}
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
            >
                {confirm?.kind === "reject" ? (
                    <div className="space-y-2">
                        <label htmlFor="ar" className="text-sm font-medium text-slate-700">
                            Reason (required, shown to the student)
                        </label>
                        <Textarea
                            id="ar"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            rows={4}
                            placeholder="Reason for rejection…"
                        />
                    </div>
                ) : null}
            </ConfirmDialog>

            <ConfirmDialog
                open={results != null}
                title="Bulk action summary"
                variant="default"
                confirmLabel="Done"
                cancelLabel="Close"
                onConfirm={() => setResults(null)}
                onCancel={() => setResults(null)}
                description={results ? `${results.filter((r) => r.ok).length} succeeded, ${results.filter((r) => !r.ok).length} failed.` : undefined}
            >
                <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
                    {(results ?? []).map((r) => (
                        <li key={r.id} className={r.ok ? "text-emerald-700" : "text-red-700"}>
                            <span className="font-medium break-words">{r.label}</span>: {r.message}
                        </li>
                    ))}
                </ul>
            </ConfirmDialog>
        </div>
    );
}
