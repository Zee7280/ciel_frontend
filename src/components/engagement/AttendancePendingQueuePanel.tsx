"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Loader2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ExternalLink,
    UserCircle,
    ClipboardList,
    Inbox,
    Users,
} from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";
import clsx from "clsx";
import {
    PARTNER_ATTENDANCE_ALL_TEAMS,
    PARTNER_ATTENDANCE_AWAIT_TEAM,
    partnerTeamBucketKey,
} from "@/utils/engagementPartnerTeamScope";

type PendingRow = Record<string, unknown>;

function pickStr(v: unknown): string {
    if (v == null) return "";
    return String(v).trim();
}

function participantDisplay(raw: Record<string, unknown>): { name: string; detail: string } {
    const p = raw.participant;
    if (!p || typeof p !== "object") return { name: "", detail: "" };
    const o = p as Record<string, unknown>;
    const name = pickStr(o.fullName ?? o.full_name);
    const uni = pickStr(o.universityName ?? o.university_name);
    const email = pickStr(o.email);
    const detail = [uni, email].filter(Boolean).join(" · ");
    return { name, detail };
}

function participantKeyFromRaw(raw: Record<string, unknown>): string {
    const p = raw.participant;
    if (p && typeof p === "object") {
        const o = p as Record<string, unknown>;
        const pid = pickStr(o.id ?? o._id ?? o.user_id ?? o.userId);
        if (pid) return `id:${pid}`;
        const email = pickStr(o.email).toLowerCase();
        if (email) return `em:${email}`;
    }
    const who = participantDisplay(raw);
    if (who.name || who.detail) return `nm:${who.name}|${who.detail}`;
    return "unknown:single";
}

export type PartnerParticipantChip = {
    key: string;
    /** Display label */
    name: string;
    /** Secondary line (university · email), may be empty */
    subtitle: string;
};

function buildParticipantRoster(rows: PendingRow[]): PartnerParticipantChip[] {
    const byKey = new Map<string, PartnerParticipantChip>();
    for (const raw of rows) {
        const r = raw as Record<string, unknown>;
        const key = participantKeyFromRaw(r);
        if (byKey.has(key)) continue;
        const who = participantDisplay(r);
        const name = who.name || "Participant";
        byKey.set(key, { key, name, subtitle: who.detail });
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatDisplayDate(raw: string): string {
    const s = raw.trim();
    if (!s) return "—";
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }
    return s;
}

/** Display-only: friendlier time labels without changing API payloads */
function formatDisplayTimeSegment(raw: string): string {
    const s = raw.trim();
    if (!s) return "";
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return s;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${min} ${ap}`;
}

export default function AttendancePendingQueuePanel({
    projectId,
    title = "Review Individual Attendance Records",
    description,
    autoLoadOnProjectIdChange = false,
    onPendingCountChanged,
    presentation = "default",
    onPartnerQueueSnapshot,
    partnerSelectedMemberKey,
    /** Partner: scope queue to a team bucket from project roster; `*` = all; await = no rows until pick. */
    partnerScopedTeamFilter,
    /** Faculty wide layout: table body scrolls inside the card (viewport-height column). */
    scrollTableInPanel = false,
}: {
    projectId: string;
    title?: string;
    description?: string;
    /** When set, the queue is fetched automatically whenever the selected project id changes. */
    autoLoadOnProjectIdChange?: boolean;
    /** Fired with the number of rows returned (after a successful load or after approve/reject/flag + reload). */
    onPendingCountChanged?: (n: number) => void;
    /** Partner attendance verification uses elevated styling; faculty and other contexts use `default`. */
    presentation?: "default" | "partner";
    /** Partner only: fired after each successful load with roster derived from rows (no extra API). */
    onPartnerQueueSnapshot?: (summary: { participants: PartnerParticipantChip[]; rowCount: number }) => void;
    /** Partner only: when set, table shows only this participant's sessions (key from `PartnerParticipantChip`). */
    partnerSelectedMemberKey?: string;
    partnerScopedTeamFilter?: string;
    scrollTableInPanel?: boolean;
}) {
    const isPartner = presentation === "partner";
    const [rows, setRows] = useState<PendingRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [acting, setActing] = useState<string | null>(null);
    const [reasonByLogId, setReasonByLogId] = useState<Record<string, string>>({});

    const onCountRef = useRef(onPendingCountChanged);
    onCountRef.current = onPendingCountChanged;

    const load = useCallback(async () => {
        if (!projectId.trim()) {
            setRows([]);
            onCountRef.current?.(0);
            return;
        }
        setLoading(true);
        try {
            const res = await authenticatedFetch(
                `/api/v1/engagement/attendance/pending?projectId=${encodeURIComponent(projectId.trim())}`,
            );
            if (!res?.ok) {
                toast.error("Could not load pending attendance.");
                setRows([]);
                onCountRef.current?.(0);
                return;
            }
            const json = await res.json();
            const next = extractPendingAttendanceRows(json);
            setRows(next);
            onCountRef.current?.(next.length);
        } catch {
            toast.error("Could not load pending attendance.");
            setRows([]);
            onCountRef.current?.(0);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (!autoLoadOnProjectIdChange) return;
        void load();
    }, [autoLoadOnProjectIdChange, projectId, load]);

    useEffect(() => {
        setRows([]);
    }, [projectId]);

    const partnerSnapRef = useRef(onPartnerQueueSnapshot);
    partnerSnapRef.current = onPartnerQueueSnapshot;

    const rowsAfterTeamScope = useMemo(() => {
        if (!isPartner) return rows;
        const scope = partnerScopedTeamFilter ?? PARTNER_ATTENDANCE_ALL_TEAMS;
        if (scope === PARTNER_ATTENDANCE_AWAIT_TEAM) return [];
        if (scope === "" || scope === PARTNER_ATTENDANCE_ALL_TEAMS) return rows;
        return rows.filter((raw) => {
            const ro = raw as Record<string, unknown>;
            const p = ro.participant;
            if (!p || typeof p !== "object") return false;
            return partnerTeamBucketKey(p as Record<string, unknown>) === scope;
        });
    }, [rows, isPartner, partnerScopedTeamFilter]);

    useEffect(() => {
        if (!isPartner || !partnerSnapRef.current) return;
        if (loading) return;
        partnerSnapRef.current({
            participants: buildParticipantRoster(rowsAfterTeamScope),
            rowCount: rowsAfterTeamScope.length,
        });
    }, [isPartner, loading, rowsAfterTeamScope]);

    const tableRows = useMemo(() => {
        if (!isPartner) return rows;
        if (!partnerSelectedMemberKey) return rowsAfterTeamScope;
        return rowsAfterTeamScope.filter(
            (raw) => participantKeyFromRaw(raw as Record<string, unknown>) === partnerSelectedMemberKey,
        );
    }, [rowsAfterTeamScope, isPartner, partnerSelectedMemberKey]);

    const scope = isPartner ? (partnerScopedTeamFilter ?? PARTNER_ATTENDANCE_ALL_TEAMS) : PARTNER_ATTENDANCE_ALL_TEAMS;
    const partnerAwaitingTeamPick = isPartner && scope === PARTNER_ATTENDANCE_AWAIT_TEAM;
    const partnerHideParticipantColumn = isPartner && Boolean(partnerSelectedMemberKey?.trim());

    const selectedMemberLabel = useMemo(() => {
        if (!isPartner || !partnerSelectedMemberKey || rowsAfterTeamScope.length === 0) return null;
        const hit = rowsAfterTeamScope.find(
            (r) => participantKeyFromRaw(r as Record<string, unknown>) === partnerSelectedMemberKey,
        );
        if (!hit) return { name: "Participant", subtitle: "" as string };
        const w = participantDisplay(hit as Record<string, unknown>);
        return { name: w.name || "Participant", subtitle: w.detail };
    }, [isPartner, partnerSelectedMemberKey, rowsAfterTeamScope]);

    const act = async (logId: string, action: "approve" | "reject" | "flag") => {
        const reason = pickStr(reasonByLogId[logId]);
        if ((action === "reject" || action === "flag") && !reason) {
            toast.error("Please enter a short reason for reject or revision request.");
            return;
        }
        const key = `${logId}:${action}`;
        setActing(key);
        try {
            const res = await authenticatedFetch(`/api/v1/engagement/attendance/${encodeURIComponent(logId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
            });
            if (!res?.ok) {
                let msg = "Action failed.";
                if (res) {
                    try {
                        const err = await res.json();
                        if (typeof err?.message === "string" && err.message.trim()) msg = err.message.trim();
                    } catch {
                        /* ignore */
                    }
                }
                toast.error(msg);
                return;
            }
            const okMsg =
                action === "approve"
                    ? "Attendance approved."
                    : action === "reject"
                      ? "Attendance rejected."
                      : "Revision requested.";
            toast.success(okMsg);
            setReasonByLogId((prev) => {
                const next = { ...prev };
                delete next[logId];
                return next;
            });
            await load();
        } catch {
            toast.error("Action failed.");
        } finally {
            setActing(null);
        }
    };

    return (
        <div
            className={clsx(
                "overflow-hidden border bg-white",
                isPartner
                    ? "rounded-2xl border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]"
                    : "rounded-xl border-slate-200 shadow-sm",
                scrollTableInPanel && "flex min-h-0 flex-1 flex-col",
            )}
        >
            <div
                className={clsx(
                    "flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
                    isPartner
                        ? "border-slate-200/70 bg-gradient-to-r from-white via-slate-50/40 to-[#0056B3]/[0.03]"
                        : "border-slate-100",
                )}
            >
                <div className="flex min-w-0 items-start gap-3">
                    <div
                        className={clsx(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isPartner
                                ? "bg-gradient-to-br from-[#0056B3] to-[#003F85] text-white shadow-md shadow-[#0056B3]/20"
                                : "bg-slate-100 text-slate-700",
                        )}
                        aria-hidden
                    >
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h2
                            className={clsx(
                                "text-base text-slate-900 sm:text-[17px]",
                                isPartner ? "font-bold tracking-tight" : "font-semibold",
                            )}
                        >
                            {title}
                        </h2>
                        {description ? (
                            <p
                                className={clsx(
                                    "mt-1 max-w-2xl text-sm text-slate-600",
                                    isPartner && "leading-relaxed",
                                )}
                            >
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {tableRows.length > 0 ? (
                        <span
                            className={clsx(
                                "hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex",
                                isPartner
                                    ? "bg-[#0056B3]/[0.08] text-[#0056B3] ring-1 ring-inset ring-[#0056B3]/15"
                                    : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
                            )}
                            aria-label={`${tableRows.length} pending`}
                        >
                            <span
                                className={clsx(
                                    "h-1.5 w-1.5 rounded-full",
                                    isPartner ? "bg-[#0056B3]" : "bg-slate-500",
                                )}
                            />
                            {tableRows.length} pending
                        </span>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={loading || !projectId.trim()}
                        className={clsx(
                            "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                            isPartner
                                ? "rounded-[10px] bg-gradient-to-r from-[#0056B3] to-[#004494] px-4 font-semibold text-white shadow-[#0056B3]/20 hover:shadow-md hover:shadow-[#0056B3]/30"
                                : "rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {autoLoadOnProjectIdChange ? "Refresh" : "Load queue"}
                    </button>
                </div>
            </div>

            {isPartner && rowsAfterTeamScope.length > 0 && partnerSelectedMemberKey && selectedMemberLabel ? (
                <div className="flex items-center gap-3 border-b border-[#0056B3]/10 bg-gradient-to-r from-[#0056B3]/[0.07] via-[#0056B3]/[0.04] to-transparent px-4 py-3.5 sm:px-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0056B3] to-[#003F85] text-white shadow-md shadow-[#0056B3]/25">
                        <UserCircle className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#0056B3]/70">
                            Selected member
                        </p>
                        <p className="truncate text-sm font-bold text-slate-900">{selectedMemberLabel.name}</p>
                        {selectedMemberLabel.subtitle ? (
                            <p className="truncate text-xs text-slate-600">{selectedMemberLabel.subtitle}</p>
                        ) : null}
                    </div>
                    {tableRows.length > 0 ? (
                        <span className="hidden rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-[#0056B3] ring-1 ring-inset ring-[#0056B3]/15 backdrop-blur-sm sm:inline-flex">
                            {tableRows.length} session{tableRows.length !== 1 ? "s" : ""}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {partnerAwaitingTeamPick && !loading ? (
                <div
                    className={clsx(
                        "mx-4 mb-4 mt-4 flex flex-col items-center gap-3 border border-dashed px-4 py-10 text-center sm:mx-5",
                        isPartner
                            ? "rounded-[14px] border-[#0056B3]/20 bg-gradient-to-br from-white via-slate-50/40 to-[#0056B3]/[0.03]"
                            : "rounded-lg border-slate-200 bg-slate-50",
                    )}
                >
                    <div
                        className={clsx(
                            "flex h-12 w-12 items-center justify-center rounded-2xl",
                            isPartner ? "bg-[#0056B3]/10 text-[#0056B3]" : "bg-slate-200 text-slate-600",
                        )}
                    >
                        <Users className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                        Select a team for this project, then choose a member to review their pending sessions.
                    </p>
                </div>
            ) : null}

            {rows.length === 0 && !loading && !partnerAwaitingTeamPick ? (
                <div
                    className={clsx(
                        "mx-4 mb-4 mt-4 flex flex-col items-center gap-3 border border-dashed px-4 py-10 text-center sm:mx-5",
                        isPartner
                            ? "rounded-[14px] border-[#0056B3]/20 bg-gradient-to-br from-white via-slate-50/40 to-[#0056B3]/[0.03]"
                            : "rounded-lg border-slate-200 bg-slate-50",
                    )}
                >
                    <div
                        className={clsx(
                            "flex h-12 w-12 items-center justify-center rounded-2xl",
                            isPartner ? "bg-[#0056B3]/10 text-[#0056B3]" : "bg-slate-200 text-slate-600",
                        )}
                    >
                        <Inbox className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                        {!projectId.trim()
                            ? "Select a project first. Only sessions routed to your role appear here."
                            : autoLoadOnProjectIdChange
                              ? "No pending attendance for this project. Try another opportunity or refresh."
                              : 'No rows loaded yet. Press "Load queue" after choosing a project.'}
                    </p>
                </div>
            ) : null}

            {rows.length > 0 && rowsAfterTeamScope.length === 0 && !loading && !partnerAwaitingTeamPick && isPartner ? (
                <div className="mx-4 mb-4 mt-4 flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[#0056B3]/20 bg-gradient-to-br from-white via-slate-50/40 to-[#0056B3]/[0.03] px-4 py-10 text-center sm:mx-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0056B3]/10 text-[#0056B3]">
                        <Users className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                        No pending attendance rows for this team. Try another team or refresh after new submissions.
                    </p>
                </div>
            ) : null}

            {loading && rows.length === 0 ? (
                <div
                    className={clsx(
                        "flex flex-col items-center justify-center gap-3 py-16",
                        isPartner ? "text-[#0056B3]" : "text-slate-400",
                    )}
                >
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                    <p className="text-xs font-medium text-slate-500">Loading attendance records…</p>
                </div>
            ) : null}

            {rowsAfterTeamScope.length > 0 && isPartner && tableRows.length === 0 && !loading ? (
                <div className="mx-4 mb-4 mt-4 flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[#0056B3]/20 bg-gradient-to-br from-white via-slate-50/40 to-[#0056B3]/[0.03] px-4 py-10 text-center sm:mx-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0056B3]/10 text-[#0056B3]">
                        <UserCircle className="h-6 w-6" aria-hidden />
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                        No attendance rows for this member in the pending queue.
                    </p>
                </div>
            ) : null}

            {tableRows.length > 0 ? (
                <div
                    className={clsx(
                        "overflow-x-auto px-2 pb-4 pt-2 sm:px-4",
                        scrollTableInPanel && "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                    )}
                >
                    <table
                        className={clsx(
                            "w-full border-collapse text-left text-sm",
                            partnerHideParticipantColumn ? "min-w-[780px]" : "min-w-[920px]",
                        )}
                    >
                        <thead>
                            <tr>
                                {[
                                    { label: "Date", extra: "whitespace-nowrap" },
                                    { label: "Location", extra: "whitespace-nowrap" },
                                    { label: "Time", extra: "whitespace-nowrap" },
                                    { label: "Work type", extra: "whitespace-nowrap" },
                                    ...(!partnerHideParticipantColumn
                                        ? [{ label: "Participant", extra: "min-w-[140px]" }]
                                        : []),
                                    { label: "Description", extra: "min-w-[160px]" },
                                    { label: "Evidence", extra: "whitespace-nowrap" },
                                    { label: "Actions", extra: "min-w-[220px]" },
                                ].map((col) => (
                                    <th
                                        key={col.label}
                                        className={clsx(
                                            "px-3 py-3 text-[11px] sm:px-4",
                                            col.extra,
                                            "sticky top-0 z-10 backdrop-blur",
                                            isPartner
                                                ? "border-b border-slate-200/80 bg-slate-50/95 py-3.5 font-bold uppercase tracking-wider text-slate-600"
                                                : "border-y border-slate-200 bg-slate-50 font-semibold uppercase tracking-wide text-slate-600",
                                        )}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.map((raw, idx) => {
                                const rawObj = raw as Record<string, unknown>;
                                const row = normalizeEngagementAttendanceLog(rawObj);
                                const id = pickStr(row.id);
                                const who = participantDisplay(rawObj);
                                const rawUrl = pickStr(rawObj.evidenceUrl ?? rawObj.evidence_url ?? rawObj.evidenceURL);
                                const fromRow =
                                    typeof row.evidence_file === "string" && /^https?:\/\//i.test(row.evidence_file.trim())
                                        ? row.evidence_file.trim()
                                        : "";
                                const evidenceUrl = fromRow || (rawUrl.startsWith("http") ? rawUrl : "");
                                const workType = pickStr(row.activity_type) || "—";
                                const desc = pickStr(row.description) || "—";
                                const st = pickStr(row.start_time);
                                const et = pickStr(row.end_time);
                                const timeCell = isPartner
                                    ? (() => {
                                          const t1 = formatDisplayTimeSegment(st) || st;
                                          const t2 = formatDisplayTimeSegment(et) || et;
                                          const timeRange = [t1, t2].filter(Boolean).join(" - ");
                                          return timeRange || "—";
                                      })()
                                    : [st, et].filter(Boolean).join(" – ") || "—";

                                return (
                                    <tr
                                        key={id || `row-${idx}`}
                                        className={clsx(
                                            "border-b border-slate-100 transition-colors",
                                            isPartner
                                                ? clsx(
                                                      "hover:bg-[#0056B3]/[0.035]",
                                                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                                                  )
                                                : "bg-white hover:bg-slate-50/80",
                                        )}
                                    >
                                        <td className="whitespace-nowrap px-3 py-3.5 align-top sm:px-4">
                                            <span className="font-semibold text-slate-900">
                                                {formatDisplayDate(pickStr(row.date))}
                                            </span>
                                        </td>
                                        <td className="max-w-[200px] px-3 py-3.5 align-top text-slate-700 sm:px-4">
                                            {pickStr(row.location) || (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3.5 align-top sm:px-4">
                                            <span
                                                className={clsx(
                                                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                                                    isPartner
                                                        ? "bg-[#0056B3]/[0.08] text-[#0056B3] ring-1 ring-inset ring-[#0056B3]/10"
                                                        : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
                                                )}
                                            >
                                                {timeCell}
                                            </span>
                                        </td>
                                        <td className="max-w-[140px] px-3 py-3.5 align-top sm:px-4">
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                                                {workType}
                                            </span>
                                        </td>
                                        {!partnerHideParticipantColumn ? (
                                            <td className="px-3 py-3.5 align-top text-slate-800 sm:px-4">
                                                {who.name ? (
                                                    <>
                                                        <span className="font-semibold text-slate-900">{who.name}</span>
                                                        {who.detail ? (
                                                            <span className="mt-0.5 block text-xs text-slate-500">{who.detail}</span>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        ) : null}
                                        <td className="max-w-[220px] px-3 py-3.5 align-top text-slate-600 sm:px-4">
                                            <span className="line-clamp-3 leading-relaxed">{desc}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3.5 align-top sm:px-4">
                                            {evidenceUrl ? (
                                                <a
                                                    href={evidenceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={clsx(
                                                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                                                        isPartner
                                                            ? "bg-[#0056B3]/10 text-[#0056B3] ring-1 ring-inset ring-[#0056B3]/15 hover:bg-[#0056B3]/15"
                                                            : "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200",
                                                    )}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                                    View
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                    Missing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3.5 align-top sm:px-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={acting !== null}
                                                        onClick={() => void act(id, "approve")}
                                                        className={clsx(
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50",
                                                            isPartner
                                                                ? "rounded-[10px] border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                                                : "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                                                        )}
                                                    >
                                                        {acting === `${id}:approve` ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        )}
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={acting !== null}
                                                        onClick={() => void act(id, "reject")}
                                                        className={clsx(
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50",
                                                            isPartner
                                                                ? "rounded-[10px] border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
                                                                : "border-red-500 bg-white text-red-700 hover:bg-red-50",
                                                        )}
                                                    >
                                                        {acting === `${id}:reject` ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        )}
                                                        Reject
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={acting !== null}
                                                        onClick={() => void act(id, "flag")}
                                                        className={clsx(
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50",
                                                            isPartner
                                                                ? "rounded-[10px] border-amber-200 bg-white text-amber-800 hover:border-amber-300 hover:bg-amber-50"
                                                                : "border-amber-500 bg-white text-amber-800 hover:bg-amber-50",
                                                        )}
                                                    >
                                                        {acting === `${id}:flag` ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                        )}
                                                        Request revision
                                                    </button>
                                                </div>
                                                <label className="block">
                                                    <span className="sr-only">Reason for rejection or revision</span>
                                                    <textarea
                                                        rows={2}
                                                        className={clsx(
                                                            "w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                                                            isPartner &&
                                                                "rounded-[10px] focus:border-[#0056B3]/40 focus:ring-[#0056B3]/12",
                                                        )}
                                                        placeholder="Reason (required for reject / request revision)"
                                                        value={reasonByLogId[id] || ""}
                                                        onChange={(e) =>
                                                            setReasonByLogId((prev) => ({ ...prev, [id]: e.target.value }))
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
