"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { REPORT_PACKAGE_LOCK_MESSAGE, REPORT_PACKAGE_LOCK_TITLE } from "@/utils/reportPackageRelease";

/**
 * The one screen every stakeholder (faculty, university, partner, NGO) sees for a submitted report
 * that CIEL PK Admin has not approved yet. Same words and layout everywhere, so the rule is read
 * the same way on every dashboard: status now, package after approval.
 */
export default function ReportPackageLockedPanel({
    backHref,
    backLabel,
    statusLabel = "Submitted · awaiting CIEL PK review",
    className = "",
}: {
    backHref: string;
    backLabel: string;
    statusLabel?: string;
    className?: string;
}) {
    return (
        <div
            data-testid="report-package-locked"
            className={`mx-auto mt-6 max-w-[720px] rounded-3xl border border-amber-200 bg-amber-50/70 px-6 py-10 text-center shadow-sm ${className}`.trim()}
            role="status"
        >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-amber-700 shadow-sm" aria-hidden>
                <Lock className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.08em] text-amber-700">{statusLabel}</p>
            <h2 className="mt-1 text-xl font-black text-[#16313d]">{REPORT_PACKAGE_LOCK_TITLE}</h2>
            <p className="mx-auto mt-2 max-w-[520px] text-sm leading-relaxed text-[#4f6068]">{REPORT_PACKAGE_LOCK_MESSAGE}</p>
            <p className="mx-auto mt-1 max-w-[520px] text-xs text-[#6b7c86]">
                You will get an in-app notification and an email with a direct link the moment the package is published.
            </p>
            <Link
                href={backHref}
                className="mt-5 inline-flex items-center rounded-full bg-[#0e7d74] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#0b665f]"
            >
                ← {backLabel}
            </Link>
        </div>
    );
}
