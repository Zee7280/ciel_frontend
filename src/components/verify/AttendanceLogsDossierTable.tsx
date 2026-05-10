import { buildAttendanceTableRows } from "@/utils/attendanceLogDisplay";

/**
 * Read-only attendance grid for print dossier + verify surfaces (full text, no truncation).
 */
export function AttendanceLogsDossierTable({
    logs,
    participantNames,
    className = "",
    headerClassName = "bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white",
}: {
    logs: unknown;
    participantNames: Record<string, string>;
    className?: string;
    headerClassName?: string;
}) {
    const rows = buildAttendanceTableRows(logs, participantNames);

    if (rows.length === 0) {
        return (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-medium italic text-slate-500">
                No attendance sessions recorded for this report.
            </p>
        );
    }

    return (
        <div className={`dossier-wide-table-wrap overflow-x-auto overscroll-x-contain ${className}`.trim()}>
            <table className="w-full min-w-0 max-w-full sm:min-w-[720px] border-collapse border border-slate-200 text-left text-[11px] sm:text-[12px]">
                <thead>
                    <tr className={headerClassName}>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Date</th>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Time</th>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Location / pin</th>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Activity</th>
                        <th className="min-w-[12rem] border-b border-slate-700 px-3 py-2.5 align-bottom">Description</th>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Hours</th>
                        <th className="min-w-[9rem] border-b border-slate-700 px-3 py-2.5 align-bottom">Participant</th>
                        <th className="border-b border-slate-700 px-3 py-2.5 align-bottom">Approval</th>
                        <th className="min-w-[11rem] border-b border-slate-700 px-3 py-2.5 align-bottom">Evidence</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                    {rows.map((row) => (
                        <tr key={row.id} className="align-top">
                            <td className="border-b border-slate-100 px-3 py-2.5 font-semibold tabular-nums text-slate-900">
                                {row.dateDisplay}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] font-medium text-slate-700">
                                {row.timeRange}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 whitespace-pre-wrap break-words text-[11px] leading-snug text-slate-800">
                                {row.location}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] font-bold uppercase tracking-tight text-slate-700">
                                {row.activity}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-800">
                                {row.description}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 font-black tabular-nums text-slate-900">{row.hours}</td>
                            <td className="border-b border-slate-100 px-3 py-2.5 text-[11px]">
                                <div className="font-semibold text-slate-900">{row.participant}</div>
                                <div className="mt-0.5 break-all font-mono text-[10px] text-slate-500">{row.participantIdRaw}</div>
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 text-[11px]">
                                <div className="font-bold text-slate-800">{row.approval}</div>
                                {row.remark ? (
                                    <div className="mt-1 whitespace-pre-wrap break-words text-[10px] font-medium text-rose-900">
                                        {row.remark}
                                    </div>
                                ) : null}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2.5 text-[11px]">
                                {row.evidenceHref ? (
                                    <a
                                        href={row.evidenceHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold break-all text-[#0F8F83] underline underline-offset-2"
                                    >
                                        {row.evidenceLabel}
                                    </a>
                                ) : (
                                    <span className="break-words font-medium text-slate-600">{row.evidenceLabel}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
