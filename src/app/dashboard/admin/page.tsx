"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import { namedTimeGreeting } from "@/utils/timeGreeting";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";
import {
    MOCKUP_GRADIENTS,
    MockupActionCard,
    MockupHero,
    MockupKpiGrid,
    MockupPanel,
    MockupSectionHead,
    MockupStatBars,
} from "@/components/ciel/dashboard/MockupChrome";

type SdgDistributionPoint = {
    name: string;
    value: number;
    color?: string;
};

type AdminDashboardData = {
    metrics?: {
        totalUsers?: {
            total?: number;
            students?: number;
            ngos?: number;
            corporates?: number;
        };
        opportunities?: number;
        verifiedHours?: number;
        pendingApprovals?: number;
        totalReports?: number;
    };
    sdgDistribution?: SdgDistributionPoint[];
    pendingSummary?: PendingSummary;
};

const DASHBOARD_FETCH = { timeoutMs: 60_000 } as const;

export default function AdminDashboard() {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const res = await authenticatedFetch(
                resolveSameOriginApiPath("/api/v1/admin/dashboard"),
                {},
                DASHBOARD_FETCH,
            );
            if (!res) {
                setLoadError("Unable to load dashboard (session or network).");
                return;
            }
            if (!res.ok) {
                const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
                setLoadError(
                    (typeof errBody.message === "string" && errBody.message) ||
                        (typeof errBody.error === "string" && errBody.error) ||
                        `Dashboard request failed (${res.status}).`,
                );
                return;
            }
            const result = await res.json().catch(() => null);
            if (result?.success && result.data) {
                setData(result.data);
            } else {
                setLoadError("Dashboard response was not successful.");
            }
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
            setLoadError(
                error instanceof Error && error.name === "AbortError"
                    ? "Request timed out. Try refresh."
                    : "Could not refresh stats. Check your connection.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const { metrics, sdgDistribution } = data || {};
    const chartData: SdgDistributionPoint[] = (sdgDistribution ?? [])
        .map((d) => {
            const row = d as SdgDistributionPoint;
            return {
                name: String(row?.name ?? "").trim() || "Unknown",
                value: typeof row?.value === "number" && Number.isFinite(row.value) ? row.value : Number(row?.value) || 0,
                color: row?.color,
            };
        })
        .filter((d) => d.value > 0);

    const pendingTotal = metrics?.pendingApprovals ?? 0;
    const totalUsers = metrics?.totalUsers?.total ?? 0;
    const reports = metrics?.totalReports ?? 0;
    const opportunities = metrics?.opportunities ?? 0;
    const completion = reports + pendingTotal > 0 ? Math.round((reports / (reports + pendingTotal)) * 100) : 0;
    const sdgTotal = chartData.reduce((sum, d) => sum + d.value, 0);

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#15988b] border-t-transparent" />
            </div>
        );
    }

    const pendingSummary: PendingSummary = data?.pendingSummary ?? {
        total: pendingTotal,
        items: [
            {
                key: "admin_pending_actions",
                title: "Pending approvals",
                count: pendingTotal,
                href: "/dashboard/admin/approvals",
                tone: "urgent",
                description: "Users, participation requests, and applications waiting for admin action.",
            },
        ],
    };

    return (
        <div className="mx-auto max-w-[1500px]">
            <MockupHero
                title={namedTimeGreeting("CIEL PK", "👋")}
                subtitle="Four impact areas. One command center. Monitor work, intervene when anyone is delayed, and turn approved projects into measurable impact intelligence."
                stats={[
                    { value: String(opportunities || totalUsers), label: "Active Records" },
                    { value: String(pendingTotal), label: "Need Attention" },
                    { value: String(reports), label: "On Impact Hub" },
                ]}
                rightStat={{ value: `${completion}%`, label: "approval completion this semester" }}
            />

            {loadError ? <p className="mt-3 text-sm font-medium text-amber-800">{loadError}</p> : null}

            <MockupSectionHead
                title="Super Admin Command Center"
                subtitle="Choose an area below to open its workflow."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MockupActionCard
                    href="/dashboard/admin/community-service"
                    emoji="🏕️"
                    ghost="🌱"
                    title="Community Service"
                    subtitle="Manage opportunity approvals, report completion, faculty review and approved impact."
                    badge="OPEN"
                    background={MOCKUP_GRADIENTS.teal}
                />
                <MockupActionCard
                    href="/dashboard/admin/path-submissions?tab=course-project"
                    emoji="📚"
                    ghost="📘"
                    title="Coursework"
                    subtitle="Track student progress, faculty review and approved sustainability-linked coursework."
                    badge="OPEN"
                    background={MOCKUP_GRADIENTS.blue}
                />
                <MockupActionCard
                    href="/dashboard/admin/path-submissions?tab=fyp-thesis"
                    emoji="🎓"
                    title="FYP / Final Year Project"
                    subtitle="Monitor FYP progress, faculty review and approved research impact records."
                    badge="OPEN"
                    background={MOCKUP_GRADIENTS.orange}
                />
                <MockupActionCard
                    href="/dashboard/admin/path-submissions?tab=startup-business"
                    emoji="💼"
                    ghost="🚀"
                    title="Startup / Venture"
                    subtitle="Track venture completion, faculty review, AI ranking and investor-ready projects."
                    badge="OPEN"
                    background={MOCKUP_GRADIENTS.purple}
                />
                <MockupActionCard
                    href="/dashboard/admin/analytics"
                    emoji="📊"
                    ghost="🏆"
                    title="Impact Intelligence Hub"
                    subtitle="Overall statistics, AI Rankings for Coursework/FYP/Startup, Community Service Composite Indicator Scores and Level badges, batches, university comparisons and impact trends."
                    badge="VIEW INTELLIGENCE"
                    background={MOCKUP_GRADIENTS.green}
                    full
                />
            </div>

            <div className="mt-5">
                <PendingActionCards summary={pendingSummary} emptyMessage="No platform approvals are pending right now." />
            </div>

            <MockupPanel title="Platform snapshot" subtitle="Live counts from the CIEL backend.">
                <MockupKpiGrid
                    items={[
                        { label: "TOTAL USERS", value: totalUsers.toLocaleString(), hint: `${(metrics?.totalUsers?.students ?? 0).toLocaleString()} students` },
                        { label: "OPPORTUNITIES", value: opportunities.toLocaleString(), hint: "All listings" },
                        { label: "VERIFIED HOURS", value: (metrics?.verifiedHours ?? 0).toLocaleString(), hint: "Across the platform" },
                        { label: "SYSTEM REPORTS", value: reports.toLocaleString(), hint: "All time" },
                    ]}
                />
                {chartData.length > 0 ? (
                    <div className="mt-4">
                        <MockupStatBars
                            title="Listings by SDG tag"
                            rows={chartData.slice(0, 6).map((d) => ({
                                label: d.name,
                                pct: sdgTotal ? Math.round((d.value / sdgTotal) * 100) : 0,
                            }))}
                        />
                    </div>
                ) : null}
            </MockupPanel>
        </div>
    );
}
