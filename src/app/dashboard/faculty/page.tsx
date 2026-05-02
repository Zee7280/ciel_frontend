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
    Building2,
    Link2,
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
import { writeFacultyScopeSession, readFacultyDashboardViewPreference, writeFacultyDashboardViewPreference, type FacultyDashboardViewClient } from "@/utils/facultyScopeSession";

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

type FacultyDashboardViewMode = FacultyDashboardViewClient;

type FacultyDashboardStats = {
    /** combined | personal | university — which slice stats are for */
    dashboard_view?: FacultyDashboardViewMode;
    requested_dashboard_view?: FacultyDashboardViewMode;
    faculty_view_modes_available?: FacultyDashboardViewMode[];
    /** Present when admin assigned delegated university visibility */
    university_scope?: {
        organization_id?: string;
        organization_name?: string;
    } | null;
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

function ChartEmpty({ message, hint }: { message: string; hint?: string }) {
    return (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
            <p className="text-sm font-semibold text-slate-600">{message}</p>
            {hint ? <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
    );
}

export default function FacultyDashboard() {
    const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewHydrated, setViewHydrated] = useState(false);
    const [dashboardView, setDashboardView] = useState<FacultyDashboardViewMode>("combined");

    useEffect(() => {
        setDashboardView(readFacultyDashboardViewPreference());
        setViewHydrated(true);
    }, []);

    useEffect(() => {
        if (!viewHydrated) return;
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                const res = await authenticatedFetch(
                    `/api/v1/faculty/dashboard?view=${encodeURIComponent(dashboardView)}`,
                );
                if (res && res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const d = data.data as FacultyDashboardStats;
                        setStats(d);
                        const modes: FacultyDashboardViewMode[] = d.faculty_view_modes_available?.length
                            ? d.faculty_view_modes_available
                            : d.university_scope
                              ? ["combined", "personal", "university"]
                              : ["combined", "personal"];
                        if (!modes.includes(dashboardView)) {
                            setDashboardView("combined");
                            writeFacultyDashboardViewPreference("combined");
                        }
                        const effective = d.dashboard_view;
                        const requested = (data.data as { requested_dashboard_view?: FacultyDashboardViewMode })
                            .requested_dashboard_view;
                        if (
                            requested === "university" &&
                            effective === "combined" &&
                            !d.university_scope
                        ) {
                            setDashboardView("combined");
                            writeFacultyDashboardViewPreference("combined");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch faculty stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [dashboardView, viewHydrated]);

    /** Header badge + cross-page hint; does not affect APIs. */
    useEffect(() => {
        if (isLoading) return;
        const scope = stats?.university_scope;
        if (scope?.organization_name) {
            writeFacultyScopeSession({
                organization_name: scope.organization_name,
                organization_id: scope.organization_id,
            });
        } else {
            writeFacultyScopeSession(null);
        }
    }, [isLoading, stats?.university_scope]);

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

    const viewModes: FacultyDashboardViewMode[] = useMemo(() => {
        if (stats?.faculty_view_modes_available?.length) {
            return stats.faculty_view_modes_available;
        }
        return stats?.university_scope ? ["combined", "personal", "university"] : ["combined", "personal"];
    }, [stats?.faculty_view_modes_available, stats?.university_scope]);

    const activeDashboardView = viewModes.includes(dashboardView) ? dashboardView : "combined";

    const viewLabels: Record<FacultyDashboardViewMode, string> = {
        combined: "All activity",
        personal: "My supervision",
        university: "University only",
    };

    const setView = (v: FacultyDashboardViewMode) => {
        writeFacultyDashboardViewPreference(v);
        setDashboardView(v);
    };

    /** UX-only: explain empty dashboard under delegated scope without changing any API behavior. */
    const delegatedDashboardLooksEmpty = useMemo(() => {
        if (isLoading || !stats?.university_scope?.organization_name) return false;
        const courses = stats.courses ?? [];
        const pendingGrading = courses.reduce((sum, c) => {
            const n = typeof c.pending_grading === "number" ? c.pending_grading : c.pending ?? 0;
            return sum + n;
        }, 0);
        return (
            (stats.students_active ?? 0) === 0 &&
            (stats.hours_verified ?? 0) === 0 &&
            (stats.pending_approvals ?? 0) === 0 &&
            courses.length === 0 &&
            pendingGrading === 0
        );
    }, [isLoading, stats]);

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
                    {viewModes.length > 1 ? (
                        <div className="mt-4 flex max-w-2xl flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                View scope · like switching profiles
                            </p>
                            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5">
                                {viewModes.map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setView(m)}
                                        disabled={isLoading}
                                        className={
                                            "rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm " +
                                            (activeDashboardView === m
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50")
                                        }
                                    >
                                        {viewLabels[m]}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-500">
                                <strong>All activity</strong> merges your listings with university-wide visibility (if
                                assigned). <strong>My supervision</strong> is only projects where you are the named
                                supervisor. <strong>University only</strong> is the delegated org slice.
                            </p>
                        </div>
                    ) : null}
                </div>
                <Link
                    href="/dashboard/faculty/analytics"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                    <TrendingUp className="h-4 w-4" />
                    Impact analytics
                </Link>
            </div>

            {stats?.university_scope?.organization_name ? (
                <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-400/70 bg-gradient-to-br from-indigo-100/90 via-white to-violet-50 p-5 shadow-lg shadow-indigo-900/10 ring-2 ring-indigo-200/60">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex min-w-0 gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                                <Building2 className="h-8 w-8" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-black tracking-tight text-indigo-950">
                                        University delegated access
                                    </p>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-100/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900 shadow-sm">
                                        <Link2 className="h-3 w-3" aria-hidden />
                                        Active
                                    </span>
                                </div>
                                <p className="mt-2 text-sm font-medium leading-relaxed text-indigo-950/90">
                                    Use <strong>View scope</strong> above to switch between <strong>All activity</strong>,{" "}
                                    <strong>My supervision</strong>, and <strong>University only</strong> (Instagram-style
                                    context). By default, totals merge both your listings and university-matched activity.
                                </p>
                                <p className="mt-2 text-sm font-medium leading-relaxed text-indigo-950/90">
                                    Totals in <strong>All activity</strong> include students whose profile{" "}
                                    <strong>University</strong> or <strong>Institution</strong> matches{" "}
                                    <strong className="break-words rounded-md bg-white/90 px-1.5 py-0.5 ring-1 ring-indigo-300/80">
                                        {stats.university_scope.organization_name}
                                    </strong>
                                    , together with your existing supervision-linked activity.
                                </p>
                                <ul className="mt-3 space-y-1.5 text-xs font-medium text-indigo-950/85">
                                    <li className="flex gap-2">
                                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                                        <span>Matching uses the same normalized text as the organization name (spacing and spelling matter).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                                        <span>Your role stays <strong>faculty</strong>; normal approvals and workflows behave as before.</span>
                                    </li>
                                </ul>
                                {delegatedDashboardLooksEmpty ? (
                                    <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/95 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-950 shadow-sm">
                                        <strong className="font-bold">Tiles still at zero?</strong> Ensure students use that exact
                                        institution name on their profile and have enrollments, verified hours, or pending items.
                                        Empty charts only mean no data yet — not a broken delegation.
                                    </div>
                                ) : null}
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-indigo-200/60 pt-4">
                                    <span className="w-full text-[11px] font-bold uppercase tracking-wide text-indigo-900/70">
                                        Related pages (same scoped students)
                                    </span>
                                    <Link
                                        href="/dashboard/faculty/approvals"
                                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-300/70 hover:bg-indigo-50"
                                    >
                                        Opportunity request approvals
                                    </Link>
                                    <Link
                                        href="/dashboard/faculty/join-applications"
                                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-300/70 hover:bg-indigo-50"
                                    >
                                        Applications & reports
                                    </Link>
                                    <Link
                                        href="/dashboard/faculty/my-opportunities"
                                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-300/70 hover:bg-indigo-50"
                                    >
                                        My opportunities
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

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
                        <ChartEmpty
                            message="No verified hours trend yet"
                            hint="Once students log verified hours on projects you supervise (or that match your university scope), a chart will appear here."
                        />
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
                            <p className="mt-0.5 text-[11px] text-slate-500">Projects in your scope</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-slate-500">
                                <GraduationCap className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Enrolled</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{isLoading ? "-" : courseSummaries.totalEnrolled}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">Total enrolled seats</p>
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
                            <p className="text-xs leading-relaxed text-slate-500">
                                No recent activity yet. Submissions, approvals, and milestones will show here when they occur.
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
                    <ChartEmpty
                        message="No impact mix to show yet"
                        hint="When your projects include SDG or impact tags, a breakdown can appear here."
                    />
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
            </div>
        </div>
    );
}
