"use client";

import Link from "next/link";

/**
 * A report a student is still writing. Shows how many of the 10 sections are done.
 * Only CIEL PK Admin may open it (pass `href`); faculty / university get a locked card —
 * the report opens for them only after the student submits.
 */
export default function ReportProgressCard({
    title,
    student,
    org,
    progressPct,
    sectionsComplete,
    sectionsTotal = 10,
    hours,
    href,
}: {
    title: string;
    student: string;
    org?: string;
    progressPct: number;
    sectionsComplete?: number;
    sectionsTotal?: number;
    hours?: number;
    /** Admin only. Omit for a locked (non-clickable) card. */
    href?: string;
}) {
    const pct = Math.max(0, Math.min(100, Math.round(progressPct || 0)));
    const meta = [student, hours ? `${hours} hrs` : "", org].filter(Boolean).join(" · ");
    const body = (
        <>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">In progress</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{title || "Report"}</p>
                    {meta ? <p className="mt-1 truncate text-xs text-slate-500">{meta}</p> : null}
                </div>
                <span className="shrink-0 text-lg font-extrabold tabular-nums text-[#0e7d74]">{pct}%</span>
            </div>
            <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Report ${pct}% filled`}
            >
                <div className="h-full rounded-full bg-[#0e7d74] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
                {sectionsComplete != null ? `${sectionsComplete} of ${sectionsTotal} sections complete · ` : ""}
                {href ? "Open report →" : "🔒 Opens after the student submits"}
            </p>
        </>
    );
    const cls = "block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
    return href ? (
        <Link href={href} className={cls + " transition hover:-translate-y-0.5 hover:border-[#0e7d74] hover:shadow-md"}>
            {body}
        </Link>
    ) : (
        <div className={cls + " opacity-95"} aria-disabled="true">
            {body}
        </div>
    );
}
