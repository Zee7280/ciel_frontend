"use client";

import { Suspense, useEffect, useState } from "react";
import { fetchStudentDashboardData, useStudentDashboardCache } from "@/utils/student-dashboard-fetch";
import { fetchImpactSummary, useImpactSummaryCache, type CielImpactSummary } from "@/utils/cielImpactSummary";
import type { DashboardData } from "@/app/dashboard/student/types";
import { CIEL_PATHS } from "@/utils/cielPaths";
import { MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import StudentImpactPortfolioTable from "./StudentImpactPortfolioTable";

export default function ImpactHistoryPage() {
    const cachedDashboard = useStudentDashboardCache();
    const cachedSummary = useImpactSummaryCache();
    const [dashboard, setDashboard] = useState<DashboardData | null>(cachedDashboard);
    const [summary, setSummary] = useState<CielImpactSummary | null>(cachedSummary);

    useEffect(() => {
        Promise.all([
            fetchStudentDashboardData({ redirectToLogin: false }),
            fetchImpactSummary({ redirectToLogin: false }),
        ]).then(([dashboardData, summaryData]) => {
            if (dashboardData) setDashboard(dashboardData);
            if (summaryData) setSummary(summaryData);
        });
    }, []);

    const viewDashboard = dashboard ?? cachedDashboard;
    const viewSummary = summary ?? cachedSummary;
    const activeRecords = viewDashboard?.overview?.activeProjectsCount ?? viewDashboard?.activeProjects?.length ?? 0;
    const verifiedHours = Math.round(viewSummary?.verifiedHours ?? viewDashboard?.overview?.totalVerifiedHours ?? 0);
    const portfolioCount = viewDashboard?.overview?.impactHistoryBadgeCount ?? viewDashboard?.overview?.completedCount ?? 0;
    const completion = Math.round(
        (CIEL_PATHS.reduce((sum, path) => sum + (viewSummary?.pathsStatus[path.key]?.progress ?? 0), 0) / (CIEL_PATHS.length || 1)) || 0,
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

            <Suspense fallback={<div className="py-10 text-center text-sm text-[#7a919a]">Loading your portfolio…</div>}>
                <StudentImpactPortfolioTable />
            </Suspense>
        </div>
    );
}
