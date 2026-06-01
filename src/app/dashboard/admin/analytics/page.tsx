"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";

export default function AdminAnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center gap-2 text-indigo-600">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Insights</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Report metrics by section with role-based visibility.{" "}
                    <Link href="/dashboard/admin/master-analytics" className="font-medium text-indigo-600 hover:underline">
                        CIEL Master filters
                    </Link>
                    {" · "}
                    <Link href="/dashboard/admin/impact" className="font-medium text-indigo-600 hover:underline">
                        Impact dashboard
                    </Link>
                </p>
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
    );
}
