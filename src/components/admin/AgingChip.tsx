export function daysSince(value: string | number | Date | null | undefined): number | null {
    if (!value) return null;
    const t = new Date(value).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** "waiting N days" chip; red once past `warnAfterDays` (default 3). */
export default function AgingChip({
    since,
    warnAfterDays = 3,
    className = "",
}: {
    since: string | number | Date | null | undefined;
    warnAfterDays?: number;
    className?: string;
}) {
    const d = daysSince(since);
    if (d == null) return null;
    const late = d > warnAfterDays;
    const text = d === 0 ? "waiting today" : `waiting ${d} day${d === 1 ? "" : "s"}`;
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${
                late ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"
            } ${className}`}
            title={late ? `Waiting longer than ${warnAfterDays} days` : undefined}
        >
            {text}
        </span>
    );
}
