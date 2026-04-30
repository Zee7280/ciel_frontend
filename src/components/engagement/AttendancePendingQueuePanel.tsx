"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, Flag, ExternalLink } from "lucide-react";
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
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
                    {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading || !projectId.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {autoLoadOnProjectIdChange ? "Refresh" : "Load queue"}
                </button>
            </div>

            {rows.length === 0 && !loading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm leading-6 text-slate-500">
                    {!projectId.trim()
                        ? "Select a project from the list first. Counts on each row show how many sessions are still pending for that opportunity."
                        : autoLoadOnProjectIdChange
                          ? "No pending attendance for this project right now. You can select another project or use Refresh to check again."
                          : 'No rows loaded yet. Choose a project and press "Load queue" (only pending items for your role are returned).'}
                </p>
            ) : null}

            <div className="space-y-4">
                {rows.map((raw, idx) => {
                    const rawObj = raw as Record<string, unknown>;
                    const row = normalizeEngagementAttendanceLog(rawObj);
                    const id = pickStr(row.id);
                    const st = pickStr(row.approval_status ?? raw.approvalStatus).toLowerCase() || "pending";
                    const who = participantDisplay(rawObj);
                    return (
                        <div
                            key={id || `row-${idx}`}
                            className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md lg:flex-row lg:items-stretch lg:gap-5"
                        >
                            <div className="flex-1 space-y-1 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${approvalBadgeClass(st)}`}>
                                        {st}
                                    </span>
                                    {pickStr(row.opportunity_creator_kind) ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Creator: {pickStr(row.opportunity_creator_kind)}
                                        </span>
                                    ) : null}
                                </div>
                                {who.name ? (
                                    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Participant</p>
                                        <p className="mt-1 font-bold text-slate-950">{who.name}</p>
                                        {who.detail ? <p className="text-xs text-slate-600 mt-0.5">{who.detail}</p> : null}
                                    </div>
                                ) : null}
                                <p className="pt-2 font-bold text-slate-950">
                                    {pickStr(row.activity_type) || "Session"} · {Number(row.hours || 0).toFixed(2)} hrs
                                </p>
                                <p className="text-slate-600">
                                    {pickStr(row.date)} · {pickStr(row.start_time)} — {pickStr(row.end_time)}
                                </p>
                                {pickStr(row.location) ? <p className="text-xs text-slate-500">{pickStr(row.location)}</p> : null}
                                {(() => {
                                    const rawUrl = pickStr(rawObj.evidenceUrl ?? rawObj.evidence_url ?? rawObj.evidenceURL);
                                    const fromRow =
                                        typeof row.evidence_file === "string" && /^https?:\/\//i.test(row.evidence_file.trim())
                                            ? row.evidence_file.trim()
                                            : "";
                                    const url = fromRow || (rawUrl.startsWith("http") ? rawUrl : "");
                                    if (!url) return null;
                                    return (
                                        <p className="pt-1">
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
                                            >
                                                View evidence
                                                <ExternalLink className="h-3 w-3" aria-hidden />
                                            </a>
                                        </p>
                                    );
                                })()}
                                <label className="block pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason (reject/flag)</span>
                                    <input
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Required when rejecting or flagging"
                                        value={reasonByLogId[id] || ""}
                                        onChange={(e) => setReasonByLogId((prev) => ({ ...prev, [id]: e.target.value }))}
                                    />
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-2 lg:w-40 lg:grid-cols-1 lg:content-start">
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "approve")}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-700/10 bg-emerald-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                                >
                                    {acting === `${id}:approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "reject")}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-700/10 bg-rose-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                                >
                                    {acting === `${id}:reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    disabled={acting !== null}
                                    onClick={() => void act(id, "flag")}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-900 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
