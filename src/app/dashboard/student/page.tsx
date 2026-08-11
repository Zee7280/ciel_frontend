"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Clock, Compass, ListChecks, CheckCircle2, Circle } from "lucide-react";
import clsx from "clsx";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import { fetchImpactSummary, readImpactSummaryCache, type CielImpactSummary } from "@/utils/cielImpactSummary";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { authenticatedFetch } from "@/utils/api";
import type { DashboardData } from "@/app/dashboard/student/types";
import { CIEL_PATHS, pathStateLabel } from "@/utils/cielPaths";
import ImpactDonut from "@/components/ciel/ImpactDonut";
import RubricMicroStrip from "@/components/ciel/RubricMicroStrip";
import StatTile from "@/components/ciel/StatTile";
import ProgressBar from "@/components/ciel/ProgressBar";
import EmptyState from "@/components/ciel/EmptyState";
import { DashboardSkeleton } from "@/components/ciel/Skeleton";

interface RecommendedOpportunity {
    id: string;
    title: string;
    organization_name?: string;
    organization?: string;
}

function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

const CERT_LADDER = [
    { key: "account", label: "Account verified" },
    { key: "hours_logged", label: "First hours logged" },
    { key: "hours_verified", label: "First hours verified" },
    { key: "report_drafted", label: "Report drafted" },
    { key: "report_submitted", label: "Report submitted" },
    { key: "report_verified", label: "Report verified" },
    { key: "certificate_issued", label: "Certificate issued" },
];

function certificateStepIndex(dashboard: DashboardData | null, summary: CielImpactSummary | null): number {
    if (!dashboard || !summary) return 1;
    const reportStatuses = dashboard.activeProjects.map((p) => p.report_status).filter(Boolean) as string[];
    const rank = (status: string) => {
        if (status === "paid") return 6;
        if (status === "verified") return 5;
        if (["submitted", "partner_verified", "payment_pending", "payment_under_review"].includes(status)) return 4;
        return 3; // draft
    };
    const bestReportRank = reportStatuses.length ? Math.max(...reportStatuses.map(rank)) : -1;

    if (bestReportRank >= 0) return bestReportRank;
    if (summary.verifiedHours > 0) return 2;
    if (summary.verifiedHours + summary.pendingHours > 0) return 1;
    return 0;
}

export default function StudentDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<CielImpactSummary | null>(() => readImpactSummaryCache());
    const [opportunities, setOpportunities] = useState<RecommendedOpportunity[]>([]);
    const [name, setName] = useState("");

    useEffect(() => {
        const user = readStoredCurrentUser();
        setName(typeof user?.name === "string" ? user.name.split(" ")[0] : "");

        Promise.all([
            fetchStudentDashboardData({ redirectToLogin: false }),
            fetchImpactSummary({ redirectToLogin: false }),
            authenticatedFetch("/api/v1/students/opportunities/recommended", {}, { redirectToLogin: false })
                .then((res) => (res?.ok ? res.json() : null))
                .then((result) => (Array.isArray(result?.data) ? result.data.slice(0, 3) : [])),
        ]).then(([dashboardData, summaryData, opps]) => {
            setDashboard(dashboardData);
            if (summaryData) setSummary(summaryData);
            setOpportunities(opps);
            setLoading(false);
        });
    }, []);

    const needsYouNow = useMemo(() => {
        if (!dashboard) return [];
        const items: Array<{ id: string; title: string; detail: string; href: string; tone?: string }> = [];
        dashboard.notificationsPreview?.active.slice(0, 2).forEach((n) =>
            items.push({ id: n.id, title: n.title, detail: n.detail, href: "/dashboard/student/paths/community-service?tab=log-hours", tone: n.tone }),
        );
        dashboard.pendingSummary?.items.slice(0, 2).forEach((n) =>
            items.push({ id: n.key, title: n.title, detail: n.description ?? `${n.count} pending`, href: n.href, tone: n.tone }),
        );
        if (summary?.pathsStatus.communityService.needsAction) {
            items.push({ id: "cs-verify", title: "Send logged hours for verification", detail: "You have hours waiting to be sent to a supervisor.", href: "/dashboard/student/paths/community-service?tab=log-hours" });
        }
        if (summary?.pathsStatus.startupBusiness.needsAction) {
            items.push({ id: "sb-visible", title: "Your venture is ready to publish", detail: "You've reached the completeness threshold — make it visible.", href: "/dashboard/student/paths/startup-business" });
        }
        return items.slice(0, 4);
    }, [dashboard, summary]);

    if (loading) return <DashboardSkeleton />;

    const certStep = certificateStepIndex(dashboard, summary);

    return (
        <div className="mx-auto max-w-[1440px] space-y-8">
            <div>
                <h1 className="text-2xl font-black text-ciel-text">{greeting()}{name ? `, ${name}` : ""}.</h1>
                <p className="mt-1 text-sm text-ciel-text-mid">Here&apos;s where your impact stands today.</p>
            </div>

            {/* Hero */}
            <div className="rounded-ciel-xl border border-ciel-border bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-8">
                    <ImpactDonut score={summary?.compositeScore ?? 0} />
                    <div className="flex-1 min-w-[240px]">
                        <p className="text-xs font-bold uppercase tracking-widest text-ciel-text-soft">Rubric breakdown</p>
                        <div className="mt-2">
                            <RubricMicroStrip scores={summary?.rubric ?? {}} />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <StatTile label="Verified hours" value={String(Math.round(summary?.verifiedHours ?? 0))} icon={Clock} />
                        <StatTile label="Active engagements" value={String(summary?.activeEngagements ?? 0)} icon={ListChecks} />
                    </div>
                </div>
            </div>

            {/* Needs you now */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-ciel-text-soft">Needs you now</h2>
                {!needsYouNow.length ? (
                    <div className="mt-3">
                        <EmptyState emoji="✅" heading="You're all caught up" line="Nothing needs your attention right now." />
                    </div>
                ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {needsYouNow.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="ciel-transition flex items-center justify-between gap-3 rounded-ciel-lg border border-ciel-border bg-white p-4 hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                            >
                                <div>
                                    <p className="text-sm font-bold text-ciel-text">{item.title}</p>
                                    <p className="mt-0.5 text-xs text-ciel-text-soft">{item.detail}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-ciel-text-soft" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Your paths */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-ciel-text-soft">Your paths</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CIEL_PATHS.map((path) => {
                        const status = summary?.pathsStatus[path.key];
                        const state = status?.state ?? "not_started";
                        return (
                            <Link
                                key={path.key}
                                href={path.href}
                                className="ciel-transition rounded-ciel-lg border border-ciel-border bg-white p-4 sm:p-5 hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl" aria-hidden>{path.emoji}</span>
                                        <span className="text-sm font-bold text-ciel-text">{path.label}</span>
                                    </div>
                                    <span
                                        className={clsx(
                                            "shrink-0 rounded-ciel-xs px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                                            state === "complete" && "bg-ciel-green-soft text-ciel-green-deep",
                                            state === "active" && "bg-ciel-indigo-soft text-ciel-indigo",
                                            state === "not_started" && "bg-ciel-page text-ciel-text-soft",
                                        )}
                                    >
                                        {pathStateLabel(state)}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-ciel-text-soft">{status?.detail ?? "Not started"}</p>
                                {state === "active" && <ProgressBar value={status?.progress ?? 0} className="mt-3" />}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Opportunities */}
            <div>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-ciel-text-soft">Recommended for you</h2>
                    <Link href="/dashboard/student/browse" className="text-xs font-bold text-ciel-green-deep hover:underline">See all</Link>
                </div>
                {!opportunities.length ? (
                    <div className="mt-3">
                        <EmptyState emoji="🧭" heading="No recommendations yet" line="Browse the opportunity board to find your next engagement." actionLabel="Browse opportunities" href="/dashboard/student/browse" />
                    </div>
                ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {opportunities.map((opp) => (
                            <Link
                                key={opp.id}
                                href={`/dashboard/student/browse/${opp.id}`}
                                className="ciel-transition rounded-ciel-lg border border-ciel-border bg-white p-4 hover:border-ciel-green/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ciel-green"
                            >
                                <Compass className="h-4 w-4 text-ciel-green-deep" />
                                <p className="mt-2 text-sm font-bold text-ciel-text">{opp.title}</p>
                                <p className="mt-0.5 text-xs text-ciel-text-soft">{opp.organization_name || opp.organization || "CIEL partner"}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent activity */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-ciel-text-soft">Recent activity</h2>
                {!dashboard?.activeProjects.length ? (
                    <div className="mt-3">
                        <EmptyState emoji="🗓️" heading="No activity yet" line="Your logged hours, reports, and path updates will appear here." />
                    </div>
                ) : (
                    <ol className="mt-3 space-y-3">
                        {dashboard.activeProjects.slice(0, 5).map((project) => (
                            <li key={project.id} className="flex items-start gap-3 rounded-ciel-lg border border-ciel-border bg-white p-4">
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-ciel-green" aria-hidden />
                                <div>
                                    <p className="text-sm font-semibold text-ciel-text">{project.title}</p>
                                    <p className="mt-0.5 text-xs text-ciel-text-soft">
                                        <span className="rounded-ciel-xs bg-ciel-indigo-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ciel-indigo">Community Service</span>
                                        {" · "}{new Date(project.assignedAt).toLocaleDateString()} · {project.status}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            {/* Certificate ladder */}
            <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-ciel-text-soft">Certificate progress</h2>
                <div className="mt-3 overflow-x-auto rounded-ciel-lg border border-ciel-border bg-white p-5">
                    <div className="flex min-w-[640px] items-center">
                        {CERT_LADDER.map((step, i) => (
                            <div key={step.key} className="flex flex-1 flex-col items-center gap-2">
                                <div className="flex w-full items-center">
                                    <div className={clsx("h-px flex-1", i === 0 ? "bg-transparent" : i <= certStep ? "bg-ciel-green" : "bg-ciel-border")} />
                                    <span
                                        className={clsx(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                            i <= certStep ? "bg-ciel-green text-white" : i === certStep + 1 ? "bg-ciel-amber-soft text-ciel-amber" : "bg-ciel-page text-ciel-text-soft",
                                        )}
                                    >
                                        {i <= certStep ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                    </span>
                                    <div className={clsx("h-px flex-1", i === CERT_LADDER.length - 1 ? "bg-transparent" : i < certStep ? "bg-ciel-green" : "bg-ciel-border")} />
                                </div>
                                <span className="max-w-[6.5rem] text-center text-[10px] font-bold text-ciel-text-mid">{step.label}</span>
                            </div>
                        ))}
                    </div>
                    {certStep >= CERT_LADDER.length - 1 && (
                        <p className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-ciel-green-deep">
                            <Award className="h-4 w-4" /> Certificate earned — download it from Reports &amp; Certificates.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
