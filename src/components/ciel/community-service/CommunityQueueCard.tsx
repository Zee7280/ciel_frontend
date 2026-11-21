"use client";

import Link from "next/link";
import { REPORT_PACKAGE_LOCK_MESSAGE, REPORT_PACKAGE_LOCK_TITLE } from "@/utils/reportPackageRelease";

/** Compact review row for submitted work that still needs a sign-off. */
export default function CommunityQueueCard({
    href,
    title,
    student,
    org,
    hours,
    cta = "Open report",
    tone = "waiting",
    locked = false,
}: {
    href?: string;
    title: string;
    student: string;
    org?: string;
    hours?: number;
    cta?: string;
    /** The package is not released yet (CIEL PK Admin has not approved): status row, no link. */
    locked?: boolean;
    /** "waiting" = earlier in the pipeline (draft/submitted, not yet faculty-approved).
     * "ready" = faculty already approved — this is what's actually actionable for whoever
     * is viewing this queue (admin/partner) right now.
     * "approved" = fully live/complete — kept for callers outside this waiting queue. */
    tone?: "waiting" | "ready" | "approved";
}) {
    const isApproved = tone === "approved";
    const isReady = tone === "ready";
    const meta = [student, hours ? `${hours} hrs` : "", org].filter(Boolean).join(" · ");

    if (locked || !href) {
        return (
            <div
                className="flex items-start gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4"
                title={REPORT_PACKAGE_LOCK_MESSAGE}
                data-testid="queue-package-locked"
            >
                <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Submitted · awaiting CIEL PK review</p>
                    <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{title || "Report"}</p>
                    {meta ? <p className="mt-1 truncate text-xs text-slate-500">{meta}</p> : null}
                    <p className="mt-2 text-xs font-semibold text-amber-800">🔒 {REPORT_PACKAGE_LOCK_TITLE}</p>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={href}
            className={
                "group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                (isApproved
                    ? "border-emerald-100 hover:border-emerald-300"
                    : isReady
                      ? "border-amber-200 hover:border-amber-400"
                      : "border-slate-200 hover:border-[#0e7d74]")
            }
        >
            <span
                className={
                    "mt-1 h-10 w-1 shrink-0 rounded-full " +
                    (isApproved ? "bg-emerald-500" : isReady ? "bg-amber-500" : "bg-[#0e7d74]")
                }
                aria-hidden
            />
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {isApproved ? "Approved" : isReady ? "Faculty approved · ready for you" : "Needs review"}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{title || "Report"}</p>
                {meta ? <p className="mt-1 truncate text-xs text-slate-500">{meta}</p> : null}
                <p
                    className={
                        "mt-2 text-xs font-semibold " +
                        (isApproved ? "text-emerald-700" : isReady ? "text-amber-700" : "text-[#0e7d74]") +
                        " group-hover:underline"
                    }
                >
                    {cta}
                </p>
            </div>
        </Link>
    );
}
