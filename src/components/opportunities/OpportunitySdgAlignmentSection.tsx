import {
    formatOpportunitySdgAlignmentLine,
    readOpportunitySdgAlignments,
} from "@/utils/opportunityDetailView";

export function OpportunitySdgAlignmentSection({
    raw,
    heading = "SDG alignment",
    className = "",
}: {
    raw: Record<string, unknown>;
    heading?: string;
    className?: string;
}) {
    const rows = readOpportunitySdgAlignments(raw);
    if (rows.length === 0) return null;

    return (
        <div className={className}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">{heading}</p>
            <ul className="space-y-2">
                {rows.map((row, index) => (
                    <li
                        key={`${row.role}-${row.sdg_id}-${row.target_id ?? ""}-${index}`}
                        className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2 text-slate-800"
                    >
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                                row.role === "primary" ? "text-purple-800" : "text-indigo-700"
                            }`}
                        >
                            {row.role === "primary" ? "Primary" : "Secondary"}
                        </span>
                        <p className="mt-0.5 text-sm font-medium">{formatOpportunitySdgAlignmentLine(row)}</p>
                        {row.justification ? (
                            <p className="mt-1 text-xs text-slate-600 leading-relaxed">{row.justification}</p>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}
