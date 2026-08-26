"use client";

import Link from "next/link";

/** Compact review row for submitted work that still needs a sign-off. */
export default function CommunityQueueCard({
    href,
    title,
    student,
    org,
    hours,
    cta = "Open report",
    tone = "waiting",
}: {
    href: string;
    title: string;
    student: string;
    org?: string;
    hours?: number;
    cta?: string;
    tone?: "waiting" | "approved";
}) {
    const isApproved = tone === "approved";
    const meta = [student, hours ? `${hours} hrs` : "", org].filter(Boolean).join(" · ");

    return (
        <Link
            href={href}
            className={
                "group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                (isApproved
                    ? "border-emerald-100 hover:border-emerald-300"
                    : "border-slate-200 hover:border-[#0e7d74]")
            }
        >
            <span
                className={
                    "mt-1 h-10 w-1 shrink-0 rounded-full " +
                    (isApproved ? "bg-emerald-500" : "bg-[#0e7d74]")
                }
                aria-hidden
            />
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {isApproved ? "Approved" : "Needs review"}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{title || "Report"}</p>
                {meta ? <p className="mt-1 truncate text-xs text-slate-500">{meta}</p> : null}
                <p
                    className={
                        "mt-2 text-xs font-semibold " +
                        (isApproved ? "text-emerald-700" : "text-[#0e7d74]") +
                        " group-hover:underline"
                    }
                >
                    {cta}
                </p>
            </div>
        </Link>
    );
}
