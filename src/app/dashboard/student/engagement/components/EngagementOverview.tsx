"use client";

import { AlertCircle, CheckCircle2, Shield, TrendingUp, Zap } from "lucide-react";
import clsx from "clsx";
import {
    EngagementIndividualMetricsTable,
    engagementIndividualMetricsHaveTableRows,
} from "@/components/verify/EngagementIndividualMetricsTable";
import { summarizeEngagementRedFlags } from "@/lib/summarizeRedFlagDetails";

interface EngagementMetrics {
    totalHours: number;
    /** Roster-scoped attendance row count (teams); falls back in UI if omitted. */
    sessionCount?: number;
    activeDays: number;
    spanWeeks: number;
    frequency: number;
    weeklyContinuity: number;
    eis: number;
    category: string;
    hecStatus: string;
    evidenceCount: number;
    evidenceRatio: number;
    requiredHours?: number;
    /** Per-student requirement × team size (Section 1); used for team institutional cards. */
    projectGoal?: number;
    individual_metrics?: any[];
    intensity?: {
        volume: number;
        continuity: number;
        span: number;
        frequency: number;
    };
    redFlags?: string[];
    isNonCompliant?: boolean;
}

function HoursStatusBanner({
    hoursMet,
    totalHours,
    projectCapacityHours,
    remainingHours,
    isTeam,
}: {
    hoursMet: boolean;
    totalHours: number;
    projectCapacityHours: number;
    remainingHours: number;
    isTeam: boolean;
}) {
    if (hoursMet) {
        return (
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-900">
                    <span className="font-semibold">Hours requirement met.</span>{" "}
                    You have {totalHours} of {projectCapacityHours} hours verified
                    {isTeam ? " for this project" : ""}.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900">
                <span className="font-semibold">Almost there.</span> You have {totalHours} of{" "}
                {projectCapacityHours} hours
                {remainingHours > 0
                    ? `. Add ${remainingHours} more before this record is complete.`
                    : ". Keep logging until the minimum is reached."}
            </p>
        </div>
    );
}

function PrimaryStatsRow({
    totalHours,
    totalSessionsDisplay,
    evidenceWithCount,
}: {
    totalHours: number;
    totalSessionsDisplay: number;
    evidenceWithCount: number;
}) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {[
                { value: `${totalHours}h`, label: "Total hours" },
                { value: String(totalSessionsDisplay), label: "Sessions" },
                { value: String(evidenceWithCount), label: "With evidence" },
            ].map((card) => (
                <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center"
                >
                    <p className="text-2xl font-bold text-indigo-600 sm:text-3xl">{card.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{card.label}</p>
                </div>
            ))}
        </div>
    );
}

export default function EngagementOverview({
    metrics,
    isTeam = false,
    hideIntensityHero = false,
    report = undefined,
}: {
    metrics: EngagementMetrics;
    isTeam?: boolean;
    /** When true, hides the dark intensity / HEC compliance hero (used in report Section 1 only). */
    hideIntensityHero?: boolean;
    /** Full report payload (e.g. `ReportData`) for resolving team member names on individual metrics rows. */
    report?: unknown;
}) {
    const requiredHours = metrics.requiredHours || 16;
    const projectCapacityHours =
        isTeam && typeof metrics.projectGoal === "number" && metrics.projectGoal > 0
            ? metrics.projectGoal
            : requiredHours;
    const totalSessionsDisplay =
        typeof metrics.sessionCount === "number"
            ? metrics.sessionCount
            : Math.round(metrics.frequency * metrics.spanWeeks) || 0;
    const completionPct = Math.round((metrics.totalHours / projectCapacityHours) * 100);
    const hoursMet = metrics.totalHours >= projectCapacityHours;
    const remainingHours = Math.max(0, Math.round((projectCapacityHours - metrics.totalHours) * 10) / 10);
    const evidenceWithCount =
        typeof metrics.evidenceCount === "number"
            ? metrics.evidenceCount
            : Math.round((metrics.evidenceRatio / 100) * Math.max(totalSessionsDisplay, 1));

    const intensity = metrics.intensity || {
        volume: Math.min(100, (metrics.totalHours / projectCapacityHours) * 100),
        continuity: metrics.weeklyContinuity || 0,
        span: Math.min(100, (metrics.spanWeeks / 12) * 100),
        frequency: Math.min(100, (metrics.frequency / 3) * 100),
    };

    const detailsFooter = (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
                {isTeam ? "Team" : "Individual"} · {completionPct}% complete
            </span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>
                EIS <span className="font-semibold text-slate-800">{metrics.eis}</span>
                <span className="text-slate-400"> / 100</span>
                {metrics.category ? ` · ${metrics.category}` : ""}
            </span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span
                className={clsx(
                    "font-medium",
                    metrics.isNonCompliant ? "text-rose-600" : hoursMet ? "text-emerald-700" : "text-amber-700",
                )}
            >
                {hoursMet ? "Eligible" : "Incomplete"}
                {" · HEC: "}
                {metrics.isNonCompliant ? "Non-compliant" : metrics.hecStatus}
            </span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>
                {metrics.activeDays} days · {metrics.spanWeeks} wks · {metrics.frequency}/wk ·{" "}
                {Math.round(metrics.evidenceRatio || 0)}% evidence
            </span>
        </div>
    );

    const individualBlock =
        isTeam && engagementIndividualMetricsHaveTableRows(metrics.individual_metrics) ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">Individual metrics</h3>
                <EngagementIndividualMetricsTable report={report} value={metrics.individual_metrics} />
            </div>
        ) : null;

    const redFlagsBlock =
        metrics.redFlags && metrics.redFlags.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm font-semibold text-rose-900">Audit alerts</p>
                <ul className="mt-2 space-y-1">
                    {summarizeEngagementRedFlags(metrics.redFlags).map((flag) => (
                        <li key={flag} className="text-sm text-rose-800">
                            · {flag}
                        </li>
                    ))}
                </ul>
            </div>
        ) : null;

    /** Report Section 1 / Metrics dashboard — match Review & submit calm card. */
    if (hideIntensityHero) {
        return (
            <div className="mx-auto max-w-2xl space-y-4">
                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <HoursStatusBanner
                        hoursMet={hoursMet}
                        totalHours={metrics.totalHours}
                        projectCapacityHours={projectCapacityHours}
                        remainingHours={remainingHours}
                        isTeam={isTeam}
                    />

                    <PrimaryStatsRow
                        totalHours={metrics.totalHours}
                        totalSessionsDisplay={totalSessionsDisplay}
                        evidenceWithCount={evidenceWithCount}
                    />

                    {detailsFooter}
                    {individualBlock}
                    {redFlagsBlock}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0c143d] via-[#101962] to-[#070b24] p-8 text-white shadow-lg sm:p-10">
                <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-start">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                <Shield className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/80">
                                {isTeam ? "Team engagement intensity" : "Student engagement intensity"}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-6xl font-bold tracking-tight text-white sm:text-7xl">
                                {metrics.eis}
                            </h2>
                            <span className="text-xl font-medium text-white/30">/100</span>
                        </div>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100">
                            {metrics.category}
                        </span>
                    </div>

                    <div className="w-full space-y-4 md:w-[280px]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400/60">
                            Intensity breakdown
                        </p>
                        {[
                            { label: "Volume (50%)", value: intensity.volume, color: "bg-cyan-400" },
                            { label: "Continuity (25%)", value: intensity.continuity, color: "bg-blue-500" },
                            { label: "Span (15%)", value: intensity.span, color: "bg-pink-500" },
                            { label: "Freq (10%)", value: intensity.frequency, color: "bg-rose-500" },
                        ].map((d) => (
                            <div key={d.label} className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-medium text-white/70">
                                    <span>{d.label}</span>
                                    <span className="text-white">{Math.round(d.value)}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full ${d.color}`}
                                        style={{ width: `${Math.min(100, d.value)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <TrendingUp
                            className={clsx(
                                "h-5 w-5",
                                metrics.isNonCompliant ? "text-rose-400" : "text-emerald-400",
                            )}
                        />
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                                HEC compliance
                            </p>
                            <p
                                className={clsx(
                                    "text-sm font-semibold",
                                    metrics.isNonCompliant ? "text-rose-400" : "text-white",
                                )}
                            >
                                {metrics.isNonCompliant ? "Non-compliant" : metrics.hecStatus}
                            </p>
                        </div>
                    </div>
                </div>

                {metrics.redFlags && metrics.redFlags.length > 0 ? (
                    <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-rose-400" />
                            <h4 className="text-xs font-semibold text-rose-200">Audit alerts</h4>
                        </div>
                        <ul className="space-y-1">
                            {summarizeEngagementRedFlags(metrics.redFlags).map((flag) => (
                                <li key={flag} className="text-xs text-rose-200/80">
                                    · {flag}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <HoursStatusBanner
                    hoursMet={hoursMet}
                    totalHours={metrics.totalHours}
                    projectCapacityHours={projectCapacityHours}
                    remainingHours={remainingHours}
                    isTeam={isTeam}
                />
                <PrimaryStatsRow
                    totalHours={metrics.totalHours}
                    totalSessionsDisplay={totalSessionsDisplay}
                    evidenceWithCount={evidenceWithCount}
                />
                {detailsFooter}
                {individualBlock}
            </div>
        </div>
    );
}
