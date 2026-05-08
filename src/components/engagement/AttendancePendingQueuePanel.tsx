"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink, UserCircle } from "lucide-react";
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
                "overflow-hidden border border-slate-200 bg-white shadow-sm",
                isPartner ? "rounded-xl border-slate-200/90" : "rounded-lg",
                scrollTableInPanel && "flex min-h-0 flex-1 flex-col",
            )}
        >
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                    <h2 className={clsx("text-base text-slate-900", isPartner ? "font-bold" : "font-semibold")}>{title}</h2>
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
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading || !projectId.trim()}
                    className={clsx(
                        "inline-flex shrink-0 items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                        isPartner
                            ? "rounded-[10px] px-4 font-semibold hover:border-[#0056B3]/35 hover:bg-[#0056B3]/[0.04] hover:text-[#0056B3]"
                            : "rounded-lg hover:bg-slate-50",
                    )}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {autoLoadOnProjectIdChange ? "Refresh" : "Load queue"}
                </button>
            </div>

            {isPartner && rowsAfterTeamScope.length > 0 && partnerSelectedMemberKey && selectedMemberLabel ? (
                <div className="flex items-center gap-3 border-b border-slate-100 bg-[#0056B3]/[0.06] px-4 py-3 sm:px-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0056B3]/[0.12]">
                        <UserCircle className="h-6 w-6 text-[#0056B3]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected member</p>
                        <p className="truncate text-sm font-bold text-slate-900">{selectedMemberLabel.name}</p>
                        {selectedMemberLabel.subtitle ? (
                            <p className="truncate text-xs text-slate-600">{selectedMemberLabel.subtitle}</p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {partnerAwaitingTeamPick && !loading ? (
                <p
                    className={clsx(
                        "mx-4 mb-4 mt-4 border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600 sm:mx-5",
                        isPartner ? "rounded-[10px] bg-slate-50/80" : "rounded-lg bg-slate-50",
                    )}
                >
                    Select a team for this project, then choose a member to review their pending sessions.
                </p>
            ) : null}

            {rows.length === 0 && !loading && !partnerAwaitingTeamPick ? (
                <p
                    className={clsx(
                        "mx-4 mb-4 mt-4 border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600 sm:mx-5",
                        isPartner ? "rounded-[10px] bg-slate-50/80" : "rounded-lg bg-slate-50",
                    )}
                >
                    {!projectId.trim()
                        ? "Select a project first. Only sessions routed to your role appear here."
                        : autoLoadOnProjectIdChange
                          ? "No pending attendance for this project. Try another opportunity or refresh."
                          : 'No rows loaded yet. Press "Load queue" after choosing a project.'}
                </p>
            ) : null}

            {rows.length > 0 && rowsAfterTeamScope.length === 0 && !loading && !partnerAwaitingTeamPick && isPartner ? (
                <p
                    className={clsx(
                        "mx-4 mb-4 mt-4 border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600 sm:mx-5",
                        "rounded-[10px] bg-slate-50/80",
                    )}
                >
                    No pending attendance rows for this team. Try another team or refresh after new submissions.
                </p>
            ) : null}

            {loading && rows.length === 0 ? (
                <div className={clsx("flex justify-center py-16", isPartner ? "text-[#0056B3]" : "text-slate-400")}>
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                </div>
            ) : null}

            {rowsAfterTeamScope.length > 0 && isPartner && tableRows.length === 0 && !loading ? (
                <p className="mx-4 mb-4 mt-4 rounded-[10px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600 sm:mx-5">
                    No attendance rows for this member in the pending queue.
                </p>
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
                            <tr
                                className={clsx(
                                    "bg-slate-50",
                                    isPartner ? "border-b border-slate-200 bg-slate-50/90" : "border-y border-slate-200",
                                )}
                            >
                                <th
                                    className={clsx(
                                        "whitespace-nowrap px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Date
                                </th>
                                <th
                                    className={clsx(
                                        "whitespace-nowrap px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Location
                                </th>
                                <th
                                    className={clsx(
                                        "whitespace-nowrap px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Time
                                </th>
                                <th
                                    className={clsx(
                                        "whitespace-nowrap px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Work type
                                </th>
                                {!partnerHideParticipantColumn ? (
                                    <th
                                        className={clsx(
                                            "min-w-[140px] px-3 py-3 text-xs text-slate-700 sm:px-4",
                                            isPartner
                                                ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                                : "font-medium",
                                        )}
                                    >
                                        Participant
                                    </th>
                                ) : null}
                                <th
                                    className={clsx(
                                        "min-w-[160px] px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Description
                                </th>
                                <th
                                    className={clsx(
                                        "whitespace-nowrap px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Evidence
                                </th>
                                <th
                                    className={clsx(
                                        "min-w-[220px] px-3 py-3 text-xs text-slate-700 sm:px-4",
                                        isPartner
                                            ? "py-3.5 font-bold uppercase tracking-wide text-slate-600"
                                            : "font-medium",
                                    )}
                                >
                                    Actions
                                </th>
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
                                            "border-b border-slate-100 transition",
                                            isPartner
                                                ? clsx(
                                                      "hover:bg-sky-50/50",
                                                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                                                  )
                                                : "bg-white hover:bg-slate-50/80",
                                        )}
                                    >
                                        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-800 sm:px-4">
                                            {formatDisplayDate(pickStr(row.date))}
                                        </td>
                                        <td className="max-w-[200px] px-3 py-3 align-top text-slate-700 sm:px-4">
                                            {pickStr(row.location) || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700 sm:px-4">
                                            {timeCell}
                                        </td>
                                        <td className="max-w-[140px] px-3 py-3 align-top text-slate-700 sm:px-4">{workType}</td>
                                        {!partnerHideParticipantColumn ? (
                                            <td className="px-3 py-3 align-top text-slate-800 sm:px-4">
                                                {who.name ? (
                                                    <>
                                                        <span className="font-medium">{who.name}</span>
                                                        {who.detail ? (
                                                            <span className="mt-0.5 block text-xs text-slate-500">{who.detail}</span>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                        ) : null}
                                        <td className="max-w-[220px] px-3 py-3 align-top text-slate-600 sm:px-4">
                                            <span className="line-clamp-3">{desc}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 align-top sm:px-4">
                                            {evidenceUrl ? (
                                                <a
                                                    href={evidenceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={clsx(
                                                        "inline-flex items-center gap-1 font-medium underline underline-offset-2",
                                                        isPartner
                                                            ? "font-semibold text-[#0056B3] decoration-[#0056B3]/35 hover:text-[#004494]"
                                                            : "text-slate-900 decoration-slate-300 hover:text-slate-700",
                                                    )}
                                                >
                                                    View
                                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                                </a>
                                            ) : (
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center gap-1 font-medium text-amber-800",
                                                        isPartner && "text-sm font-semibold",
                                                    )}
                                                >
                                                    <AlertTriangle
                                                        className={clsx("h-4 w-4 shrink-0", isPartner && "text-amber-600")}
                                                        aria-hidden
                                                    />
                                                    Missing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top sm:px-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={acting !== null}
                                                        onClick={() => void act(id, "approve")}
                                                        className={clsx(
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                                                            isPartner
                                                                ? "rounded-[10px] border-2 border-emerald-600 bg-white font-bold text-emerald-700 hover:bg-emerald-50"
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
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border border-red-500 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50",
                                                            isPartner && "rounded-[10px] border-2 border-red-600 font-bold",
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
                                                            "inline-flex items-center justify-center gap-1 rounded-lg border border-amber-500 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-50",
                                                            isPartner && "rounded-[10px] border-2 border-amber-600 font-bold text-amber-900",
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
