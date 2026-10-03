"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Globe2, LayoutDashboard, RefreshCw } from "lucide-react";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";
import MasterPlatformKpisPanel from "@/components/analytics/MasterPlatformKpisPanel";
import ImpactHighlightsPanel from "@/components/analytics/ImpactHighlightsPanel";
import StakeholderSnapshotPanel from "@/components/analytics/StakeholderSnapshotPanel";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";

type AnalyticsTab = "platform" | "impact" | "stakeholder";

const TABS: { id: AnalyticsTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "platform", label: "Platform KPIs", icon: LayoutDashboard },
    { id: "impact", label: "Impact & SDGs", icon: BarChart3 },
    { id: "stakeholder", label: "Stakeholder lens", icon: Globe2 },
];

const DEFAULT_TAB: AnalyticsTab = "platform";

function isTab(v: string | null): v is AnalyticsTab {
    return v === "platform" || v === "impact" || v === "stakeholder";
}

function AdminAnalyticsPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const tab: AnalyticsTab = isTab(tabParam) ? tabParam : DEFAULT_TAB;
    const [refreshKey, setRefreshKey] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        setLastUpdated(new Date());
    }, []);

    const setTab = useCallback(
        (next: AnalyticsTab) => {
            const params = new URLSearchParams(searchParams.toString());
            if (next === DEFAULT_TAB) params.delete("tab");
            else params.set("tab", next);
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname, searchParams],
    );

    return (
        <div className="mx-auto max-w-[1400px] space-y-4 pb-10">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">BI workspace</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics &amp; Impact</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Platform KPIs, social impact metrics, and stakeholder-lens reporting for HEC, Government, and UN.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500" aria-live="polite">
                        {lastUpdated
                            ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : ""}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setRefreshKey((k) => k + 1);
                            setLastUpdated(new Date());
                        }}
                        className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                    <Link
                        href="/dashboard/admin/master-analytics"
                        className="inline-flex w-fit items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        CIEL Master →
                    </Link>
                </div>
            </header>

            <UnifiedAnalyticsOverview
                key={`overview-${refreshKey}`}
                apiPath="/api/v1/admin/analytics/overview"
                query={{ scope: "aggregate" }}
                title="Platform overview"
            />

            <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        aria-pressed={tab === id}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                            tab === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                ))}
            </div>

            {tab === "platform" ? (
                <MasterPlatformKpisPanel key={`kpis-${refreshKey}`} />
            ) : tab === "impact" ? (
                <ImpactHighlightsPanel key={`impact-${refreshKey}`} />
            ) : (
                <div className="space-y-8">
                    <StakeholderSnapshotPanel key={`stake-${refreshKey}`} />
                    <div className="border-t border-slate-200 pt-6">
                        <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Drill-down</p>
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">Report analytics by section</h2>
                        </div>
                        <AnalyticsHub
                            key={`hub-${refreshKey}`}
                            views={[
                                {
                                    id: "ciel",
                                    label: "CIEL.PK",
                                    apiPath: "/api/v1/admin/analytics/section1",
                                    query: { scope: "aggregate" },
                                    description: "Full platform aggregate with CIEL field visibility.",
                                },
                                {
                                    id: "un",
                                    label: "UN / Government",
                                    apiPath: "/api/v1/admin/analytics/section1/stakeholders",
                                    query: { slice: "un" },
                                    description: "External stakeholder lens — non-personal aggregates only.",
                                },
                            ]}
                            defaultViewId="ciel"
                            hideOnError={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminAnalyticsPage() {
    return (
        <Suspense fallback={null}>
            <AdminAnalyticsPageInner />
        </Suspense>
    );
}
