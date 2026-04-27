"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, Flag } from "lucide-react";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import { normalizeEngagementAttendanceLog } from "@/utils/engagementAttendanceMap";
import { extractPendingAttendanceRows } from "@/utils/engagementPendingAttendanceResponse";

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

function approvalBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s === "approved") return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s === "rejected") return "bg-rose-50 text-rose-800 border-rose-200";
    if (s === "flagged") return "bg-amber-50 text-amber-900 border-amber-200";
    if (s === "pending") return "bg-slate-50 text-slate-700 border-slate-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function AttendancePendingQueuePanel({
    projectId,
    title = "Pending attendance",
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
            toast.error("Please enter a short reason for reject/flag.");
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
            toast.success(`Attendance ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "flagged"}.`);
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
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading || !projectId.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {autoLoadOnProjectIdChange ? "Refresh" : "Load queue"}
                </button>
            </div>

            {rows.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
                    {!projectId.trim()
                        ? "Select an opportunity above. The list includes how many sessions are still waiting in each project."
                        : autoLoadOnProjectIdChange
                          ? "No pending attendance for this project right now. You can select another project or use Refresh to check again."
                          : 'No rows loaded yet. Choose a project and press "Load queue" (only pending items for your role are returned).'}
                </p>
            ) : null}

            <div className="space-y-3">
                {rows.map((raw, idx) => {
                    const rawObj = raw as Record<string, unknown>;
                    const row = normalizeEngagementAttendanceLog(rawObj);
                    const id = pickStr(row.id);
                    const st = pickStr(row.approval_status ?? raw.approvalStatus).toLowerCase() || "pending";
                    const who = participantDisplay(rawObj);
                    return (
                        <div
                            key={id || `row-${idx}`}
                            className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-stretch gap-4"
                        >
                            <div className="flex-1 space-y-1 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${approvalBadgeClass(st)}`}>
                                        {st}
                                    </span>
                                    {pickStr(row.opportunity_creator_kind) ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Creator: {pickStr(row.opportunity_creator_kind)}
                                        </span>
                                    ) : null}
                                </div>
                                {who.name ? (
                                    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Participant</p>
                                        <p className="font-semibold text-slate-900">{who.name}</p>
                                        {who.detail ? <p className="text-xs text-slate-600 mt-0.5">{who.detail}</p> : null}
                                    </div>
                                ) : null}
                                <p className="font-bold text-slate-900">
                                    {pickStr(row.activity_type) || "Session"} · {Number(row.hours || 0).toFixed(2)} hrs
                                </p>
                                <p className="text-slate-600">
                                    {pickStr(row.date)} · {pickStr(row.start_time)} — {pickStr(row.end_time)}
                                </p>
                                {pickStr(row.location) ? <p className="text-xs text-slate-500">{pickStr(row.location)}</p> : null}
                                <label className="block pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason (reject/flag)</span>
                                    <input
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Required when rejecting or flagging"
                                        value={reasonByLogId[id] || ""}
                                        onChange={(e) => setReasonByLogId((prev) => ({ ...prev, [id]: e.target.value }))}
                                    />
                                </label>
                            </div>
                            <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "approve")}
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {acting === `${id}:approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "reject")}
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                    {acting === `${id}:reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "flag")}
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                >
                                    {acting === `${id}:flag` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                                    Flag
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
