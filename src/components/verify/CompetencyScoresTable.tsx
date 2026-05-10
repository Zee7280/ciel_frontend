import clsx from "clsx";

import {
    COMPETENCY_SCORE_DEFINITIONS,
    formatCompetencyKeyFallback,
    pickNumericCompetencyValue,
    resolveExtraCompetencyKeys,
} from "@/utils/competencyScoresCatalog";

function asScoreRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function CompetencyScoresTable({
    scores,
    className,
    headClassName,
    emptyLabel = "Pending verification / not provided",
}: {
    scores: unknown;
    className?: string;
    /** Table header row classes (print dossier uses dark header). */
    headClassName?: string;
    emptyLabel?: string;
}) {
    const record = asScoreRecord(scores);
    const keys = record ? Object.keys(record).filter((k) => record[k] !== undefined) : [];
    if (!record || keys.length === 0) {
        return (
            <p className="text-[13px] font-medium italic text-slate-400">
                {emptyLabel}
            </p>
        );
    }

    const extras = resolveExtraCompetencyKeys(record);

    type Row = { area: string; label: string; score: string | number };
    const rows: Row[] = [];
    let prevGroup = "";
    for (const def of COMPETENCY_SCORE_DEFINITIONS) {
        if (!(def.key in record)) continue;
        const showGroup = def.group !== prevGroup;
        prevGroup = def.group;
        rows.push({
            area: showGroup ? def.group : "",
            label: def.label,
            score: pickNumericCompetencyValue(record[def.key]) ?? "—",
        });
    }
    extras.forEach((key, i) => {
        rows.push({
            area: i === 0 ? "Other" : "",
            label: formatCompetencyKeyFallback(key),
            score: pickNumericCompetencyValue(record[key]) ?? "—",
        });
    });

    return (
        <div className={clsx("overflow-x-auto", className)}>
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
                <thead>
                    <tr
                        className={
                            headClassName ??
                            "bg-slate-900 text-[9px] font-black uppercase tracking-widest text-white"
                        }
                    >
                        <th className="px-3 py-2.5 align-middle">Area</th>
                        <th className="px-3 py-2.5 align-middle">Competency</th>
                        <th className="w-[4.5rem] px-3 py-2.5 text-center align-middle whitespace-nowrap">Score (1–5)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                    {rows.map((row, idx) => (
                        <tr key={`${row.label}-${idx}`}>
                            <td className="px-3 py-2 align-top text-[11px] font-bold uppercase tracking-tight text-slate-500 w-[7.5rem]">
                                {row.area}
                            </td>
                            <td className="px-3 py-2 align-top font-medium leading-snug">{row.label}</td>
                            <td className="px-3 py-2 text-center align-top font-black tabular-nums">{row.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
