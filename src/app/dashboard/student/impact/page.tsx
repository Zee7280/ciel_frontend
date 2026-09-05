"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import { fetchImpactSummary, type CielImpactSummary } from "@/utils/cielImpactSummary";
import type { DashboardData } from "@/app/dashboard/student/types";
import { CIEL_PATHS } from "@/utils/cielPaths";
import { DashboardSkeleton } from "@/components/ciel/Skeleton";
import { MockupHero, MockupSectionHead } from "@/components/ciel/dashboard/MockupChrome";
import StudentImpactPortfolioTable from "./StudentImpactPortfolioTable";

export default function ImpactHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<CielImpactSummary | null>(null);

    useEffect(() => {
        Promise.all([
            fetchStudentDashboardData({ redirectToLogin: false }),
            fetchImpactSummary({ redirectToLogin: false }),
        ]).then(([dashboardData, summaryData]) => {
            setDashboard(dashboardData);
            if (summaryData) setSummary(summaryData);
            setLoading(false);
        });
    }, []);

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
                title="My Impact Portfolio"
                subtitle="Every approved Community Service, Coursework, FYP and Startup record appears here automatically."
                stats={[
                    { value: String(activeRecords), label: "Active Records" },
                    { value: verifiedHours ? `${verifiedHours}h` : "0h", label: "Verified Service" },
                    { value: String(portfolioCount), label: "Impact Portfolio" },
                ]}
                rightStat={{ value: `${completion}%`, label: "overall current-work completion" }}
            />

            <MockupSectionHead
                title="My Impact Portfolio"
                subtitle="Your combined verified portfolio across all four impact areas."
                action={
                    <Link href="/dashboard/student" className="border-0 bg-transparent text-xs font-black text-[#087c75] hover:underline">
                        ← Back to module buttons
                    </Link>
                }
            />

            <Suspense fallback={<div className="py-10 text-center text-sm text-[#7a919a]">Loading your portfolio…</div>}>
                <StudentImpactPortfolioTable />
            </Suspense>
        </div>
    );
}
