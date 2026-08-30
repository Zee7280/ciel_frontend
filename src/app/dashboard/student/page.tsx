"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import { fetchImpactSummary, readImpactSummaryCache, type CielImpactSummary } from "@/utils/cielImpactSummary";
import { authenticatedFetch } from "@/utils/api";
import type { DashboardData } from "@/app/dashboard/student/types";
import { CIEL_PATHS } from "@/utils/cielPaths";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import { readStoredCurrentUser } from "@/utils/currentUser";
import { DashboardSkeleton } from "@/components/ciel/Skeleton";
import {
    MOCKUP_GRADIENTS,
    MockupActionCard,
    MockupHero,
    MockupPanel,
    MockupSectionHead,
} from "@/components/ciel/dashboard/MockupChrome";

interface RecommendedOpportunity {
    id: string;
    title: string;
    organization_name?: string;
    organization?: { name?: string } | null;
}

const PATH_CARDS = [
    {
        key: "communityService" as const,
        href: "/dashboard/student/paths/community-service",
        emoji: "🏕️",
        ghost: "🌱",
        title: "Community Service",
        subtitle: "Create or join opportunities, track approvals, complete your report and build verified community impact.",
        badge: "OPEN",
        background: MOCKUP_GRADIENTS.teal,
    },
    {
        key: "courseProject" as const,
        href: "/dashboard/student/paths/course-project",
        emoji: "📚",
        ghost: "📘",
        title: "Coursework",
        subtitle: "Document sustainability-linked academic work and track faculty verification.",
        badge: "OPEN",
        background: MOCKUP_GRADIENTS.blue,
    },
    {
        key: "fypThesis" as const,
        href: "/dashboard/student/paths/fyp-thesis",
        emoji: "🎓",
        ghost: "🎓",
        title: "FYP / Final Year Project",
        subtitle: "Build your final-year impact record from draft to faculty verification.",
        badge: "OPEN",
        background: MOCKUP_GRADIENTS.orange,
    },
    {
        key: "startupBusiness" as const,
        href: "/dashboard/student/paths/startup-business",
        emoji: "💼",
        ghost: "🚀",
        title: "Startup / Venture",
        subtitle: "Create your venture record, upload your business plan and build a verified entrepreneurial profile.",
        badge: "OPEN",
        background: MOCKUP_GRADIENTS.purple,
    },
];

export default function StudentDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<CielImpactSummary | null>(() => readImpactSummaryCache());
    const [opportunities, setOpportunities] = useState<RecommendedOpportunity[]>([]);
    const firstName = useMemo(() => {
        const name = readStoredCurrentUser()?.name;
        return typeof name === "string" ? name.trim().split(/\s+/)[0] : "";
    }, []);

    useEffect(() => {
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
        const items: Array<{ id: string; title: string; detail: string; href: string }> = [];
        dashboard.notificationsPreview?.active.slice(0, 2).forEach((n) =>
            items.push({ id: n.id, title: n.title, detail: n.detail, href: "/dashboard/student/paths/community-service?tab=log-hours" }),
        );
        dashboard.pendingSummary?.items.slice(0, 2).forEach((n) =>
            items.push({ id: n.key, title: n.title, detail: n.description ?? `${n.count} pending`, href: n.href }),
        );
        if (summary?.pathsStatus.communityService.needsAction) {
            items.push({ id: "cs-verify", title: "Send logged hours for verification", detail: "You have hours waiting to be sent to a supervisor.", href: "/dashboard/student/paths/community-service?tab=log-hours" });
        }
        if (summary?.pathsStatus.startupBusiness.needsAction) {
            items.push({ id: "sb-visible", title: "Your venture is ready to publish", detail: "You've reached the completeness threshold — make it visible.", href: "/dashboard/student/paths/startup-business?view=workspace" });
        }
        return items.slice(0, 4);
    }, [dashboard, summary]);

    if (loading) return <DashboardSkeleton />;

    const activeRecords = dashboard?.overview?.activeProjectsCount ?? dashboard?.activeProjects?.length ?? 0;
    const verifiedHours = Math.round(summary?.verifiedHours ?? dashboard?.overview?.totalVerifiedHours ?? 0);
    const portfolioCount = dashboard?.overview?.impactHistoryBadgeCount ?? dashboard?.overview?.completedCount ?? 0;
    const completion = Math.round(
        (CIEL_PATHS.reduce((sum, path) => sum + (summary?.pathsStatus[path.key]?.progress ?? 0), 0) / (CIEL_PATHS.length || 1)) || 0,
    );

    return (
        <div className="mx-auto max-w-[1500px]">
            <MockupHero
                title={namedTimeGreeting(firstName, "👋")}
                subtitle="Four impact areas. One portfolio. Start your work, track every approval, and build a verified record of your academic and community impact."
                stats={[
                    { value: String(activeRecords), label: "Active Records" },
                    { value: verifiedHours ? `${verifiedHours}h` : "0h", label: "Verified Service" },
                    { value: String(portfolioCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            <MockupSectionHead
                title="My Impact Dashboard"
                subtitle="Choose an area below to start or continue your work."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {PATH_CARDS.map((card) => (
                    <MockupActionCard
                        key={card.key}
                        href={card.href}
                        emoji={card.emoji}
                        ghost={card.ghost}
                        title={card.title}
                        subtitle={summary?.pathsStatus[card.key]?.detail || card.subtitle}
                        badge={card.badge}
                        background={card.background}
                    />
                ))}
                <MockupActionCard
                    href="/dashboard/student/impact"
                    emoji="🏆"
                    ghost="🏅"
                    title="My Impact Portfolio"
                    subtitle="See all approved Community Service, Coursework, FYP and Startup records in one place."
                    badge="VIEW PORTFOLIO"
                    background={MOCKUP_GRADIENTS.green}
                    full
                />
            </div>

            {needsYouNow.length > 0 ? (
                <MockupPanel title="Needs you now" subtitle="Open the item that is waiting for you.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {needsYouNow.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="rounded-[14px] border border-[#dde5ea] bg-[#f7fafb] px-4 py-3.5 hover:border-[#15988b]"
                            >
                                <p className="text-sm font-extrabold text-[#16313d]">{item.title}</p>
                                <p className="mt-1 text-xs text-[#70808a]">{item.detail}</p>
                            </Link>
                        ))}
                    </div>
                </MockupPanel>
            ) : null}

            <MockupPanel title="Recommended for you" subtitle="Approved Community Service opportunities already live for students.">
                {!opportunities.length ? (
                    <p className="text-sm text-[#70808a]">
                        Browse the opportunity board to find your next engagement.{" "}
                        <Link href="/dashboard/student/browse" className="font-extrabold text-[#087c75]">
                            See all
                        </Link>
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {opportunities.map((opp) => (
                            <Link
                                key={opp.id}
                                href={`/dashboard/student/browse/${opp.id}`}
                                className="rounded-[14px] border border-[#dde5ea] bg-[#f7fafb] p-4 hover:border-[#15988b]"
                            >
                                <p className="text-[10px] font-black uppercase tracking-wide text-[#087c75]">Opportunity</p>
                                <p className="mt-1 text-sm font-extrabold text-[#16313d]">{opp.title}</p>
                                <p className="mt-1 text-xs text-[#70808a]">{opp.organization_name || opp.organization?.name || "CIEL partner"}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </MockupPanel>
        </div>
    );
}
