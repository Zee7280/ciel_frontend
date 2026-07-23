"use client";

import Link from "next/link";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";

export default function AdminAnalyticsPage() {
    return (
        <div className="mx-auto max-w-[1400px] space-y-4 pb-10">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">BI workspace</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Platform KPIs and Sections 1–10 report drill-down with CIEL and UN/Government lenses.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Link
                        href="/dashboard/admin/master-analytics"
                        className="border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        CIEL Master
                    </Link>
                    <Link
                        href="/dashboard/admin/impact"
                        className="border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Impact
                    </Link>
                </div>
            </header>

            <UnifiedAnalyticsOverview
                apiPath="/api/v1/admin/analytics/overview"
                query={{ scope: "aggregate" }}
                title="Platform overview"
            />

            <div className="border-t border-slate-200 pt-4">
                <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Drill-down</p>
                    <h2 className="text-base font-semibold tracking-tight text-slate-900">Report analytics by section</h2>
                </div>
                <AnalyticsHub
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
    );
}
