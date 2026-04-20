"use client";

import React from "react";
import type { ReportCIIauditMeta } from "@/lib/parseCIIauditSummary";
import { AlertOctagon, AlertTriangle, Info, ListChecks, MessageSquareQuote, ShieldAlert } from "lucide-react";
import clsx from "clsx";

type Props = {
    audit: ReportCIIauditMeta;
    /** When set, shows a short line relating audit to numeric CII. */
    ciiTotalScore?: number;
    className?: string;
};

function riskStyles(risk: string | null, needsRevision: boolean) {
    const r = (risk || "").toLowerCase();
    if (needsRevision || r.includes("reject")) {
        return {
            wrap: "border-rose-200 bg-rose-50/90",
            badge: "bg-rose-600 text-white border-rose-700",
            label: "text-rose-900",
        };
    }
    if (r.includes("needs revision") || r.includes("needs-revision")) {
        return {
            wrap: "border-amber-200 bg-amber-50/90",
            badge: "bg-amber-600 text-white border-amber-700",
            label: "text-amber-950",
        };
    }
    if (r.includes("safe")) {
        return {
            wrap: "border-emerald-200 bg-emerald-50/80",
            badge: "bg-emerald-600 text-white border-emerald-700",
            label: "text-emerald-950",
        };
    }
    return {
        wrap: "border-slate-200 bg-slate-50/90",
        badge: "bg-slate-700 text-white border-slate-800",
        label: "text-slate-900",
    };
}

export default function CIIauditInsightsPanel({ audit, ciiTotalScore, className }: Props) {
    const rs = riskStyles(audit.risk_level, audit.needs_revision);
    const showCiiHint =
        typeof ciiTotalScore === "number" &&
        !Number.isNaN(ciiTotalScore) &&
        ciiTotalScore < 72;

    return (
        <div
            className={clsx(
                "rounded-2xl border shadow-sm overflow-hidden",
                rs.wrap,
                className,
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 py-4 border-b border-black/5 bg-white/60">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-black/10 flex items-center justify-center text-rose-600 shadow-sm">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            CII transparency
                        </p>
                        <h3 className={clsx("text-sm font-black tracking-tight", rs.label)}>
                            Why your score may be lower — audit red flags
                        </h3>
                        <p className="text-[11px] font-medium text-slate-600 leading-snug">
                            Pulled from your Section 11 AI cross-check (hours, activities, outcomes, evidence, SDGs). This
                            does not replace formal review; it explains common gaps that drag the CII index down.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {audit.credibility ? (
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                            Credibility: {audit.credibility}
                        </span>
                    ) : null}
                    {audit.risk_level ? (
                        <span
                            className={clsx(
                                "inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                                rs.badge,
                            )}
                        >
                            Risk: {audit.risk_level}
                        </span>
                    ) : null}
                </div>
            </div>

            {showCiiHint ? (
                <div className="px-5 py-2.5 border-b border-black/5 bg-white/40 text-[11px] font-semibold text-slate-600 flex gap-2 items-start">
                    <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                    <span>
                        Your current CII-style total is on the lower side ({Math.round(ciiTotalScore)}/100). The items
                        below are the most likely narrative or evidence mismatches flagged by the auditor prompt.
                    </span>
                </div>
            ) : null}

            <div className="p-5 space-y-4 bg-white/40">
                {audit.critical_red_flags ? (
                    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 mb-2 flex items-center gap-2">
                            <AlertOctagon className="w-3.5 h-3.5" /> Critical red flags
                        </p>
                        <p className="text-xs font-medium text-rose-950/90 leading-relaxed whitespace-pre-wrap">
                            {audit.critical_red_flags}
                        </p>
                    </div>
                ) : null}

                {audit.moderate_issues ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Moderate issues
                        </p>
                        <p className="text-xs font-medium text-amber-950/90 leading-relaxed whitespace-pre-wrap">
                            {audit.moderate_issues}
                        </p>
                    </div>
                ) : null}

                {audit.minor_issues ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> Minor issues
                        </p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {audit.minor_issues}
                        </p>
                    </div>
                ) : null}

                {audit.top_fixes.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <ListChecks className="w-3.5 h-3.5" /> Top fixes before a stronger CII
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 text-xs font-medium text-slate-800 leading-relaxed">
                            {audit.top_fixes.map((fix, i) => (
                                <li key={i}>{fix}</li>
                            ))}
                        </ol>
                    </div>
                ) : null}

                {audit.final_remark ? (
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                            Auditor remark
                        </p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {audit.final_remark}
                        </p>
                    </div>
                ) : null}

                {audit.student_feedback ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-2 flex items-center gap-2">
                            <MessageSquareQuote className="w-3.5 h-3.5" /> Student feedback (revision focus)
                        </p>
                        <p className="text-xs font-medium text-indigo-950/90 leading-relaxed whitespace-pre-wrap">
                            {audit.student_feedback}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
