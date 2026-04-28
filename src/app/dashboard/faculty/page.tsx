"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    BookOpen,
    GraduationCap,
    FileBarChart,
    Users as UsersIcon,
    Clock,
    AlertCircle,
    TrendingUp,
    Layers,
    Activity,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import { authenticatedFetch } from "@/utils/api";
import PendingActionCards, { type PendingSummary } from "@/components/dashboard/PendingActionCards";

type FacultyCourse = {
    id?: string;
    title?: string;
    name?: string;
    code?: string;
    semester?: string;
    students?: number;
    enrolled_students?: number;
    pending?: number;
    pending_grading?: number;
};

type TrendPoint = {
    label?: string;
    month?: string;
    name?: string;
    hours?: number;
    value?: number;
};

type DistributionPoint = {
    name?: string;
    label?: string;
    value?: number;
    count?: number;
    color?: string;
};

type ActivityItem = {
    title?: string;
    message?: string;
    description?: string;
    subtitle?: string;
    created_at?: string;
    /** Nest / JSON often uses camelCase */
    createdAt?: string;
    at?: string;
};

type FacultyDashboardStats = {
    students_active?: number;
    hours_verified?: number;
    pending_approvals?: number;
    courses?: FacultyCourse[];
    /** Time series: verified hours per period (backend can add). */
    hours_trend?: TrendPoint[];
    /** Categorical counts e.g. SDG tags or opportunity types (backend can add). */
    impact_distribution?: DistributionPoint[];
    /** Short list for the activity panel (backend can add). */
    recent_activity?: ActivityItem[];
    pendingSummary?: PendingSummary;
};

function normalizeHoursTrend(raw?: TrendPoint[]) {
    if (!raw?.length) return [];
    return raw.map((p, i) => ({
        name: String(p.label ?? p.month ?? p.name ?? `P${i + 1}`),
        hours: typeof p.hours === "number" ? p.hours : typeof p.value === "number" ? p.value : 0,
    }));
}

function normalizeDistribution(raw?: DistributionPoint[]) {
    if (!raw?.length) return [];
    return raw.map((d, i) => ({
        name: String(d.name ?? d.label ?? `Item ${i + 1}`),
        value: typeof d.value === "number" ? d.value : typeof d.count === "number" ? d.count : 0,
        color: d.color,
    }));
}

function ChartEmpty({ message }: { message: string }) {
    return (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
            <p className="text-sm font-semibold text-slate-600">{message}</p>
            <p className="mt-1 text-xs text-slate-500">
                Backend can attach this series on <code className="rounded bg-slate-200/80 px-1 py-0.5">GET /api/v1/faculty/dashboard</code>.
            </p>
        </div>
    );
}

export default function FacultyDashboard() {
    const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await authenticatedFetch(`/api/v1/faculty/dashboard`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setStats(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch faculty stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const hoursChartData = useMemo(() => normalizeHoursTrend(stats?.hours_trend), [stats?.hours_trend]);
    const distributionChartData = useMemo(() => normalizeDistribution(stats?.impact_distribution), [stats?.impact_distribution]);

    const courseSummaries = useMemo(() => {
        const courses = stats?.courses ?? [];
        const totalEnrolled = courses.reduce((sum, c) => {
            const n = typeof c.enrolled_students === "number" ? c.enrolled_students : c.students ?? 0;
            return sum + n;
        }, 0);
        const totalPendingGrading = courses.reduce((sum, c) => {
            const n = typeof c.pending_grading === "number" ? c.pending_grading : c.pending ?? 0;
            return sum + n;
        }, 0);
        return { courseCount: courses.length, totalEnrolled, totalPendingGrading };
    }, [stats?.courses]);

    const recentActivity = stats?.recent_activity ?? [];
    const pendingSummary: PendingSummary = stats?.pendingSummary ?? {
        total: (stats?.pending_approvals ?? 0) + courseSummaries.totalPendingGrading,
        items: [
            {
                key: "faculty_pending_approvals",
                title: "Pending approvals",
                count: stats?.pending_approvals ?? 0,
                href: "/dashboard/faculty/approvals",
                tone: "warning",
                description: "Student-created opportunities or reports waiting for faculty review.",
            },
            {
                key: "faculty_pending_grading",
                title: "Pending grading",
                count: courseSummaries.totalPendingGrading,
                href: "/dashboard/faculty/grading",
                tone: "neutral",
                description: "Submitted student work still waiting for grading.",
            },
        ],
    };

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Faculty Dashboard</h1>
                    <p className="text-slate-500">Overview of student activities and impact.</p>
                </div>
                <Link
                    href="/dashboard/faculty/analytics"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                    <TrendingUp className="h-4 w-4" />
                    Impact analytics
                </Link>
            </div>

            <PendingActionCards summary={pendingSummary} emptyMessage="No approvals or grading items are pending." />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                        <UsersIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase text-slate-500">Active Students</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.students_active || 0}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="rounded-xl bg-green-50 p-3 text-green-600">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase text-slate-500">Hours Verified</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.hours_verified || 0}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold uppercase text-slate-500">Pending Approvals</p>
                        <h3 className="text-2xl font-bold text-slate-900">{isLoading ? "-" : stats?.pending_approvals || 0}</h3>
                    </div>
                </div>
            </div>

            {/* Charts + side widgets */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Verified hours trend</h2>
                            <p className="text-xs text-slate-500">Rolling totals for your students (per month or week).</p>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="flex min-h-[260px] items-center justify-center rounded-xl bg-slate-50">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : hoursChartData.length === 0 ? (
                        <ChartEmpty message="No trend data yet" />
                    ) : (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={hoursChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "none",
                                            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.12)",
                                        }}
                                    />
                                    <Line type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-slate-500">
                                <Layers className="h-4 w-4 text-indigo-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Courses</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{isLoading ? "-" : courseSummaries.courseCount}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">From dashboard payload</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-slate-500">
                                <GraduationCap className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Enrolled</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{isLoading ? "-" : courseSummaries.totalEnrolled}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">Sum across courses</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-bold text-slate-800">Recent activity</h3>
                            </div>
                            {courseSummaries.totalPendingGrading > 0 ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    {courseSummaries.totalPendingGrading} to grade
                                </span>
                            ) : null}
                        </div>
                        {isLoading ? (
                            <div className="space-y-2 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                                ))}
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-xs text-slate-500">
                                Activity will list here when the API includes <code className="rounded bg-slate-100 px-1">recent_activity</code>.
                            </p>
                        ) : (
                            <ul className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                                {recentActivity.map((item, idx) => {
                                    const line = item.title || item.message || "Update";
                                    const sub = item.description || item.subtitle;
                                    const when = item.at || item.created_at || item.createdAt;
                                    return (
                                        <li key={idx} className="rounded-lg border border-slate-50 bg-slate-50/80 px-3 py-2">
                                            <p className="text-xs font-semibold text-slate-800">{line}</p>
                                            {sub ? <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p> : null}
                                            {when ? <p className="mt-1 text-[10px] font-medium uppercase text-slate-400">{when}</p> : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Distribution chart */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Impact mix</h2>
                    <p className="text-xs text-slate-500">SDG alignment, opportunity types, or other buckets your team prefers.</p>
                </div>
                {isLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-slate-50">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                    </div>
                ) : distributionChartData.length === 0 ? (
                    <ChartEmpty message="No distribution data yet" />
                ) : (
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal stroke="#e2e8f0" vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={120}
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "#f1f5f9" }}
                                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.12)" }}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                                    {distributionChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || "#6366f1"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {(stats?.courses ?? []).map((course, index) => {
                    const title = course.title || course.name || "Untitled course";
                    const code = course.code || "—";
                    const semester = course.semester || "Current semester";
                    const enrolled = typeof course.enrolled_students === "number" ? course.enrolled_students : course.students ?? 0;
                    const pending = typeof course.pending_grading === "number" ? course.pending_grading : course.pending ?? 0;

                    return (
                        <div
                            key={course.id || `${code}-${title}-${index}`}
                            className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="mb-6 flex items-start justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{code}</span>
                            </div>

                            <h3 className="mb-1 text-lg font-bold text-slate-800 transition-colors group-hover:text-indigo-600">{title}</h3>
                            <p className="mb-6 text-xs text-slate-500">{semester}</p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-slate-500">
                                        <GraduationCap className="h-4 w-4" /> Enrolled
                                    </span>
                                    <span className="font-bold text-slate-800">{enrolled}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-slate-500">
                                        <FileBarChart className="h-4 w-4" /> Pending Grading
                                    </span>
                                    <span className={`font-bold ${pending > 0 ? "text-amber-500" : "text-green-500"}`}>{pending}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3 border-t border-slate-50 pt-6">
                                <button className="flex-1 rounded-lg bg-slate-50 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                                    View Roster
                                </button>
                                <button className="flex-1 rounded-lg bg-indigo-50 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100">
                                    Grade Work
                                </button>
                            </div>
                        </div>
                    );
                })}

                {!isLoading && (stats?.courses?.length ?? 0) === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:col-span-3">
                        <p className="text-sm font-semibold text-slate-700">No courses found</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Course cards will appear here when dashboard API returns faculty course data.
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
