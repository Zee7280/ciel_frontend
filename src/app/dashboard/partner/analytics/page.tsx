"use client";

import { BarChart3 } from "lucide-react";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";

export default function PartnerAnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center gap-2 text-indigo-600">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Insights</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Organization-wide participation and verification by report section.
                </p>
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
    );
}
