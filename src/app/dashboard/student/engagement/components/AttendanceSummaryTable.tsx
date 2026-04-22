"use client";

import React from "react";
import { Clock, Calendar, Tag, CheckCircle2, Trash2, MessageSquareText } from "lucide-react";
import clsx from "clsx";

interface AttendanceEntry {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    hours: number;
    activity_type: string;
    entryStatus?: 'pending' | 'verified' | 'flagged';
    /** From backend attendance approval (null = legacy). */
    approval_status?: string | null;
    /** Rejection / return notes from reviewer (see normalizeEngagementAttendanceLog). */
    approval_remark?: string | null;
    /** Raw CIEL attendance entity (e.g. report JSON) when not normalized. */
    approvalActionReason?: string | null;
    approval_action_reason?: string | null;
    evidence_file?: any;
    participantId?: string;
}

function displayApprovalLabel(entry: AttendanceEntry): string {
    const raw = entry.approval_status ?? entry.entryStatus;
    if (raw == null || String(raw).trim() === "") return "Verified (legacy)";
    const s = String(raw).trim().toLowerCase();
    if (s === "pending") return "Pending review";
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "flagged") return "Flagged";
    return s.replace(/_/g, " ");
}

function approvalPillClass(entry: AttendanceEntry): string {
    const raw = (entry.approval_status ?? entry.entryStatus ?? "").toString().toLowerCase();
    if (!raw || raw === "verified") return "bg-slate-50 text-slate-500 border-slate-100";
    if (raw === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (raw === "rejected") return "bg-rose-50 text-rose-700 border-rose-100";
    if (raw === "flagged") return "bg-amber-50 text-amber-800 border-amber-100";
    if (raw === "pending") return "bg-amber-50/80 text-amber-800 border-amber-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
}

function isRejectedEntry(entry: AttendanceEntry): boolean {
    const raw = (entry.approval_status ?? entry.entryStatus ?? "").toString().toLowerCase();
    return raw === "rejected";
}

/** Normalized `approval_remark` or raw backend `approvalActionReason` (report verify pages pass raw logs). */
function resolvedRejectRemark(entry: AttendanceEntry): string {
    const candidates = [entry.approval_remark, entry.approvalActionReason, entry.approval_action_reason];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
}

export default function AttendanceSummaryTable({ entries, onDelete, isLocked = false, participantNames = {}, embedded = false }: {
    entries: AttendanceEntry[],
    onDelete?: (id: string) => void,
    isLocked?: boolean,
    participantNames?: Record<string, string>,
    /** When true, omit outer card chrome (parent already provides a panel). */
    embedded?: boolean,
}) {
    const [remarkOpenId, setRemarkOpenId] = React.useState<string | null>(null);
    const actionCol = !isLocked && !!onDelete;
    const colSpan = actionCol ? 7 : 6;

    const toggleRemarkRow = (id: string) => {
        setRemarkOpenId((prev) => (prev === id ? null : id));
    };

    const entryIdsKey = entries.map((e) => e.id).join("|");
    React.useEffect(() => {
        setRemarkOpenId(null);
    }, [entryIdsKey]);
    if (entries.length === 0) {
        return (
            <div
                className={clsx(
                    "p-10 text-center sm:p-12",
                    embedded ? "rounded-2xl bg-slate-50/60" : "rounded-3xl border border-slate-100 bg-white",
                )}
            >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                    <Calendar className="h-8 w-8" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">No attendance entries yet</h3>
                <p className="text-sm font-medium text-slate-500">Your logged engagement sessions will appear here.</p>
            </div>
        );
    }

    return (
        <div
            className={clsx(
                "relative flex min-w-0 flex-col",
                embedded
                    ? ""
                    : "overflow-hidden rounded-[2.5rem] border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/40 transition-all hover:border-report-primary-border/20",
            )}
        >
            {!embedded ? (
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-report-primary/30 to-transparent" />
            ) : null}

            <div className="w-full min-w-0 overflow-x-auto selection:bg-report-primary/10">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Date & Session</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Activity Type</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Student</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Duration</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Approval</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 text-center">Evidence</th>
                            {!isLocked && onDelete && <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {entries.map((entry) => (
                            <React.Fragment key={entry.id}>
                            <tr className="hover:bg-report-primary-soft/10 transition-all group border-b border-slate-50 last:border-0">
                                <td className="px-5 py-7">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black text-lg shrink-0 border-2 border-slate-100 shadow-sm group-hover:border-report-primary/30 transition-all group-hover:scale-105 group-hover:rotate-2">
                                            {new Date(entry.date).getDate()}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base tracking-tight" suppressHydrationWarning>
                                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {entry.start_time} — {entry.end_time}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-7">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-report-primary-soft group-hover:text-report-primary transition-colors">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{entry.activity_type}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-7">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                            {(participantNames[entry.participantId || ''] || '??').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                            {participantNames[entry.participantId || ''] || 'Team Member'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-7">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <span className="text-lg font-black text-slate-900 tabular-nums">{entry.hours} <span className="text-[10px] text-slate-400 font-black uppercase ml-0.5">hrs</span></span>
                                    </div>
                                </td>
                                <td className="px-5 py-7">
                                    {isRejectedEntry(entry) ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleRemarkRow(entry.id)}
                                            aria-expanded={remarkOpenId === entry.id}
                                            className={clsx(
                                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-shadow hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-1",
                                                approvalPillClass(entry),
                                            )}
                                        >
                                            {displayApprovalLabel(entry)}
                                            <MessageSquareText className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
                                        </button>
                                    ) : (
                                        <span
                                            className={clsx(
                                                "inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                                                approvalPillClass(entry),
                                            )}
                                        >
                                            {displayApprovalLabel(entry)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-7 text-center">
                                    {typeof entry.evidence_file === 'string' ? (
                                        <a href={entry.evidence_file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2 bg-report-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-report-primary-shadow hover:opacity-90 transition-all cursor-pointer">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> VIEW
                                        </a>
                                    ) : entry.evidence_file ? (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black border-2 border-emerald-100 uppercase tracking-widest">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> LINKED
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">No Evidence</span>
                                    )}
                                </td>
                                {!isLocked && onDelete && (

                                    <td className="px-8 py-7 text-right">
                                        <button
                                            onClick={() => onDelete(entry.id)}
                                            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all bg-white rounded-xl border-2 border-slate-100 hover:border-red-100 hover:shadow-lg hover:shadow-red-50 hover:bg-red-50/30"
                                        >
                                            <Trash2 className="w-4.5 h-4.5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                            {remarkOpenId === entry.id && isRejectedEntry(entry) ? (
                                <tr className="bg-rose-50/50 border-b border-rose-100/80">
                                    <td colSpan={colSpan} className="px-5 py-4">
                                        <div className="rounded-xl border border-rose-100 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-1.5">
                                                Rejection remarks
                                            </p>
                                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                                                {resolvedRejectRemark(entry) ||
                                                    "No written remarks were provided for this rejection."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
