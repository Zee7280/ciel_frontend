"use client";

import { Clock, Calendar, Tag, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import clsx from "clsx";

interface AttendanceEntry {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    hours: number;
    activity_type: string;
    entryStatus?: 'pending' | 'verified' | 'flagged';
    evidence_file?: any;
    participantId?: string;
}

export default function AttendanceSummaryTable({ entries, onDelete, isLocked = false, participantNames = {} }: {
    entries: AttendanceEntry[],
    onDelete?: (id: string) => void,
    isLocked?: boolean,
    participantNames?: Record<string, string>
}) {
    if (entries.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No attendance entries yet</h3>
                <p className="text-slate-500 text-sm font-medium">Your logged engagement sessions will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden transition-all hover:border-report-primary-border/20 flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-report-primary/30 to-transparent" />

            <div className="w-full overflow-x-auto selection:bg-report-primary/10">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Date & Session</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Activity Type</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Student</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Duration</th>
                            <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 text-center">Evidence</th>
                            {!isLocked && onDelete && <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-report-primary-soft/10 transition-all group border-b border-slate-50 last:border-0">
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
