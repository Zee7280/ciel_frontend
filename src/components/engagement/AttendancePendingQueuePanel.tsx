"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";
import clsx from "clsx";

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
}: {
    projectId: string;
    title?: string;
    description?: string;
    /** When set, the queue is fetched automatically whenever the selected project id changes. */
    autoLoadOnProjectIdChange?: boolean;
    /** Fired with the number of rows returned (after a successful load or after approve/reject/flag + reload). */
    onPendingCountChanged?: (n: number) => void;
}) {
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
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    {description ? (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading || !projectId.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#0056B3]/35 hover:bg-[#0056B3]/[0.04] hover:text-[#0056B3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {autoLoadOnProjectIdChange ? "Refresh" : "Load queue"}
                </button>
            </div>

            {rows.length === 0 && !loading ? (
                <p className="mx-4 mb-4 mt-4 rounded-[10px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600 sm:mx-5">
                    {!projectId.trim()
                        ? "Select a project first. Only sessions routed to your role appear here."
                        : autoLoadOnProjectIdChange
                          ? "No pending attendance for this project. Try another opportunity or refresh."
                          : 'No rows loaded yet. Press "Load queue" after choosing a project.'}
                </p>
            ) : null}

            {loading && rows.length === 0 ? (
                <div className="flex justify-center py-16 text-[#0056B3]">
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                </div>
            ) : null}

            {rows.length > 0 ? (
                <div className="overflow-x-auto px-2 pb-4 pt-2 sm:px-4">
                    <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/90">
                                <th className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Date
                                </th>
                                <th className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Location
                                </th>
                                <th className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Time
                                </th>
                                <th className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Work type
                                </th>
                                <th className="min-w-[140px] px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Participant
                                </th>
                                <th className="min-w-[160px] px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Description
                                </th>
                                <th className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Evidence
                                </th>
                                <th className="min-w-[220px] px-3 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600 sm:px-4">
                                    Actions
                                </th>
                                </tr>
                        </thead>
                        <tbody>
                            {rows.map((raw, idx) => {
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
                                const t1 = formatDisplayTimeSegment(st) || st;
                                const t2 = formatDisplayTimeSegment(et) || et;
                                const timeRange = [t1, t2].filter(Boolean).join(" – ");
                                const timeCell = timeRange || "—";

                                return (
                                    <tr
                                        key={id || `row-${idx}`}
                                        className={clsx(
                                            "border-b border-slate-100 transition-colors hover:bg-sky-50/50",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
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
                                        <td className="max-w-[220px] px-3 py-3 align-top text-slate-600 sm:px-4">
                                            <span className="line-clamp-3">{desc}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 align-top sm:px-4">
                                            {evidenceUrl ? (
                                                <a
                                                    href={evidenceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold text-[#0056B3] underline decoration-[#0056B3]/35 underline-offset-2 hover:text-[#004494]"
                                                >
                                                    View
                                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800">
                                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
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
                                                            "inline-flex items-center justify-center gap-1 rounded-[10px] border-2 border-emerald-600 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50",
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
                                                            "inline-flex items-center justify-center gap-1 rounded-[10px] border-2 border-red-600 bg-white px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50",
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
                                                            "inline-flex items-center justify-center gap-1 rounded-[10px] border-2 border-amber-600 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-50 disabled:opacity-50",
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
                                                        className="w-full resize-y rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0056B3]/40 focus:ring-2 focus:ring-[#0056B3]/12"
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
