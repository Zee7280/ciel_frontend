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
}

export default function AttendanceSummaryTable({ entries, onDelete, isLocked = false }: {
    entries: AttendanceEntry[],
    onDelete?: (id: string) => void,
    isLocked?: boolean
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Session</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Type</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Evidence</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                            {!isLocked && onDelete && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0 border border-blue-100 shadow-sm">
                                            {new Date(entry.date).getDate()}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-base">
                                                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                {entry.start_time} — {entry.end_time}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6 transition-all">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{entry.activity_type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        <span className="text-base font-black text-slate-900">{entry.hours} <span className="text-[10px] text-slate-400 font-black">HRS</span></span>
                                    </div>
                                </td>
                                <td className="px-6 py-6 text-center">
                                    {typeof entry.evidence_file === 'string' ? (
                                        <a href={entry.evidence_file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black border border-blue-200 shadow-sm transition-colors cursor-pointer">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> VIEW
                                        </a>
                                    ) : entry.evidence_file ? (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black border border-emerald-100 shadow-sm">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> LINKED
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Evidence</span>
                                    )}
                                </td>
                                <td className="px-6 py-6 text-right">
                                    <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border shadow-sm ${entry.entryStatus === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        entry.entryStatus === 'flagged' ? 'bg-red-50 text-red-600 border-red-100' :
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                        <div className={clsx("w-1.5 h-1.5 rounded-full mr-2",
                                            entry.entryStatus === 'verified' ? 'bg-emerald-500' :
                                                entry.entryStatus === 'flagged' ? 'bg-red-500' : 'bg-amber-500'
                                        )}></div>
                                    </div>
                                </td>
                                {!isLocked && onDelete && (
                                    <td className="px-6 py-6 text-right">
                                        <button
                                            onClick={() => onDelete(entry.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-lg border border-slate-100 hover:border-red-100 hover:bg-red-50/50 shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
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
