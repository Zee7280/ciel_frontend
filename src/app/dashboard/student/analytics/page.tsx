"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";
import { authenticatedFetch } from "@/utils/api";
import { readStudentDashboardCache } from "@/utils/student-dashboard-fetch";

type ProjectOption = { id: string; title: string | null };

export default function StudentAnalyticsPage() {
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const applyProjects = (list: ProjectOption[]) => {
            if (cancelled) return;
            setProjects(list);
            setProjectId(list[0]?.id ?? null);
            setLoading(false);
        };

        const cached = readStudentDashboardCache();
        const cachedList = (cached?.activeProjects ?? [])
            .filter((p) => p?.id)
            .map((p) => ({ id: p.id, title: p.title ?? null }));
        if (cachedList.length > 0) {
            applyProjects(cachedList);
            return () => {
                cancelled = true;
            };
        }

        void (async () => {
            try {
                const res = await authenticatedFetch("/api/v1/student/projects", {}, { redirectToLogin: true });
                if (!res?.ok) {
                    applyProjects([]);
                    return;
                }
                const body = await res.json().catch(() => ({}));
                const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
                const list = (raw as { id?: string; title?: string }[])
                    .filter((p) => p?.id)
                    .map((p) => ({ id: String(p.id), title: p.title ? String(p.title) : null }));
                applyProjects(list);
            } catch {
                applyProjects([]);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const projectTitle = projects.find((p) => p.id === projectId)?.title ?? null;

    if (loading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1400px] space-y-4 pb-10">
            <header className="border-b border-slate-200 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">BI workspace</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Read-only report metrics for your active project, organized by section.
                </p>
                {projects.length > 1 && (
                    <label className="mt-3 block max-w-sm">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Project ({projects.length})
                        </span>
                        <select
                            value={projectId ?? ""}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title || "Untitled project"}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </header>

            {projectId ? (
                <>
                    <UnifiedAnalyticsOverview
                        apiPath={`/api/v1/student/projects/${encodeURIComponent(projectId)}/analytics/overview`}
                        title={projectTitle ? `${projectTitle} overview` : "Project overview"}
                    />
                    <div className="border-t border-slate-200 pt-4">
                        <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Drill-down</p>
                            <h2 className="text-base font-semibold tracking-tight text-slate-900">My report by section</h2>
                        </div>
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
                    </div>
                </>
            ) : (
                <div className="border border-slate-200 bg-white px-6 py-8 text-center">
                    <p className="text-sm text-slate-600">No active project found yet.</p>
                    <Link
                        href="/dashboard/student/projects"
                        className="mt-3 inline-block text-sm font-semibold text-slate-900 underline"
                    >
                        View my projects
                    </Link>
                </div>
            )}
        </div>
    );
}
