"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import { authenticatedFetch } from "@/utils/api";
import { readStudentDashboardCache } from "@/utils/student-dashboard-fetch";

export default function StudentAnalyticsPage() {
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectTitle, setProjectTitle] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const applyProject = (id: string | null, title: string | null) => {
            if (cancelled) return;
            setProjectId(id);
            setProjectTitle(title);
            setLoading(false);
        };

        const cached = readStudentDashboardCache();
        const firstCached = cached?.activeProjects?.[0];
        if (firstCached?.id) {
            applyProject(firstCached.id, firstCached.title ?? null);
            return () => {
                cancelled = true;
            };
        }

        void (async () => {
            try {
                const res = await authenticatedFetch("/api/v1/student/projects", {}, { redirectToLogin: true });
                if (!res?.ok) {
                    applyProject(null, null);
                    return;
                }
                const body = await res.json().catch(() => ({}));
                const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
                const first = raw[0] as { id?: string; title?: string } | undefined;
                applyProject(first?.id ? String(first.id) : null, first?.title ? String(first.title) : null);
            } catch {
                applyProject(null, null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="mb-2 flex items-center gap-2 text-indigo-600">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Insights</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">Read-only report metrics for your active project, organized by section.</p>
            </div>

            {projectId ? (
                <AnalyticsHub
                    views={[
                        {
                            id: "student",
                            label: "Student",
                            apiPath: `/api/v1/student/projects/${encodeURIComponent(projectId)}/section1-analytics`,
                        },
                    ]}
                    projectTitleOverride={projectTitle ?? undefined}
                    reportLink={`/dashboard/student/report?projectId=${encodeURIComponent(projectId)}`}
                    hideOnError={false}
                />
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm text-slate-600">No active project found yet.</p>
                    <Link
                        href="/dashboard/student/projects"
                        className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                    >
                        View my projects
                    </Link>
                </div>
            )}
        </div>
    );
}
