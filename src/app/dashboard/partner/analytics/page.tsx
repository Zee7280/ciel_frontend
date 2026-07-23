"use client";

import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";

export default function PartnerAnalyticsPage() {
    return (
        <div className="mx-auto max-w-[1400px] space-y-4 pb-10">
            <header className="border-b border-slate-200 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">BI workspace</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Organization-wide participation and verification by report section.
                </p>
            </header>

            <UnifiedAnalyticsOverview
                apiPath="/api/v1/partners/analytics/overview"
                query={{ scope: "aggregate" }}
                title="Organization overview"
            />

            <div className="border-t border-slate-200 pt-4">
                <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Drill-down</p>
                    <h2 className="text-base font-semibold tracking-tight text-slate-900">Report analytics by section</h2>
                </div>
                <AnalyticsHub
                    views={[
                        {
                            id: "partner",
                            label: "Partner",
                            apiPath: "/api/v1/partners/analytics/section1",
                            query: { scope: "aggregate" },
                        },
                    ]}
                    hideOnError={false}
                />
            </div>
        </div>
    );
}
