import clsx from "clsx";

import type { IndividualMetric } from "@/app/dashboard/student/report/utils/engagementMetrics";
import { resolveTeamMemberDisplayName } from "@/utils/reportQuality";

function parseIndividualMetricRows(value: unknown): IndividualMetric[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (item): item is IndividualMetric =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as IndividualMetric).student_id === "string" &&
            (item as IndividualMetric).student_id.trim() !== "",
    );
}

export function engagementIndividualMetricsHaveTableRows(value: unknown): boolean {
    return parseIndividualMetricRows(value).length > 0;
}

export function EngagementIndividualMetricsTable({
    report,
    value,
    insetClassName,
}: {
    report: unknown;
    value: unknown;
    /** Full container classes (e.g. admin `inset` + `p-0`). Defaults to a white bordered panel. */
    insetClassName?: string;
}) {
    const rows = parseIndividualMetricRows(value);
    if (!rows.length) return null;

    return (
        <div
            className={clsx(
                "dossier-wide-table-wrap overflow-x-auto overscroll-x-contain",
                insetClassName ?? "rounded-xl border border-slate-200 bg-white",
            )}
        >
            <table className="w-full min-w-0 max-w-full border-collapse text-left text-xs sm:text-sm sm:min-w-[640px]">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Participant</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Hours</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Gateway</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Completion</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Team EIS</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Bonus</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Final</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 min-w-[140px]">Band</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Final status</th>
                        <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Evidence</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const rec = row as unknown as Record<string, unknown>;
                        const name = resolveTeamMemberDisplayName(report, rec);
                        return (
                            <tr key={`${row.student_id}-${idx}`} className="border-b border-slate-100 last:border-b-0 align-top">
                                <td className="px-3 py-2.5">
                                    <div className="font-semibold text-slate-900 leading-snug">{name}</div>
                                    <div className="mt-0.5 font-mono text-[10px] text-slate-500 break-all">{row.student_id}</div>
                                </td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.individual_hours}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.gateway_status}</td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.completion_percentage}%</td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.team_eis}</td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-800">{row.bonus}</td>
                                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                                    {row.final_score == null ? "—" : row.final_score}
                                </td>
                                <td className="px-3 py-2.5 text-slate-800 max-w-[220px] leading-snug">{row.band}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.final_status}</td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-slate-800">{row.evidence_status}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
