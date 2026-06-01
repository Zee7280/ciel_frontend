"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Users,
    Clock,
    Award,
    Loader2,
    ShieldCheck,
    User,
    UsersRound,
    BookOpen,
    PieChart as PieChartIcon,
    ArrowLeft,
    Filter,
    RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import {
    CIEL_FACULTY_DASHBOARD_VIEW_EVENT,
    readFacultyDashboardViewPreference,
    writeFacultyDashboardViewPreference,
    type FacultyDashboardViewClient,
} from "@/utils/facultyScopeSession";

type TrendPoint = { label?: string; month?: string; name?: string; hours?: number; value?: number };
type DistributionPoint = { name?: string; label?: string; value?: number; count?: number; color?: string };

type FilterMeta =
    | { active: false }
    | { active: true; params: Record<string, string> };

type FacultyAnalyticsPayload = {
    dashboard_view?: FacultyDashboardViewClient;
    university_scope?: { organization_id?: string; organization_name?: string } | null;
    faculty_view_modes_available?: FacultyDashboardViewClient[];
    total_students_under_faculty?: number;
    verified_students?: number;
    verification_rate_percent?: number;
    individual_participants?: number;
    team_participants?: number;
    total_teams?: number;
    average_team_size?: number;
    total_required_hours?: number;
    course_linked_ce_ratio_percent?: number;
    hours_verified?: number;
    projects_completed?: number;
    avg_impact_score?: number;
    hours_trend?: TrendPoint[];
    impact_distribution?: DistributionPoint[];
    filter_meta?: FilterMeta;
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

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#64748b", "#ec4899", "#06b6d4"];

const YEAR_OF_STUDY_OPTIONS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Graduate",
    "Postgraduate",
] as const;

const ACADEMIC_INTEGRATION_OPTIONS = [
    "Voluntary",
    "Course-Linked",
    "Credit-Bearing",
    "Capstone / Thesis",
    "Research-Integrated",
] as const;

const PARTICIPATION_TYPE_OPTIONS = [
    { value: "", label: "Any" },
    { value: "individual", label: "Individual" },
    { value: "team", label: "Team" },
] as const;

const VERIFICATION_OPTIONS = [
    { value: "", label: "Any" },
    { value: "verified", label: "Verified (profile + identity)" },
    { value: "unverified", label: "Not fully verified" },
] as const;

type FacultyAnalyticsFilters = {
    project_id: string;
    course_section: string;
    degree_program: string;
    year_of_study: string;
    academic_integration_type: string;
    participation_type: string;
    verification_status: string;
    period_start: string;
    period_end: string;
};

const EMPTY_FILTERS: FacultyAnalyticsFilters = {
    project_id: "",
    course_section: "",
    degree_program: "",
    year_of_study: "",
    academic_integration_type: "",
    participation_type: "",
    verification_status: "",
    period_start: "",
    period_end: "",
};

function facultyAnalyticsApiUrl(view: FacultyDashboardViewClient, filters: FacultyAnalyticsFilters): string {
    const pathBase = resolveSameOriginApiPath("/api/v1/faculty/analytics");
    const u = new URL(pathBase);
    u.searchParams.set("view", view);
    (Object.entries(filters) as [keyof FacultyAnalyticsFilters, string][]).forEach(([key, value]) => {
        const t = value.trim();
        if (t) u.searchParams.set(key, t);
    });
    return u.toString();
}

function ChartEmpty({ message }: { message: string }) {
    return (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center text-sm font-medium text-slate-500">
            {message}
        </div>
    );
}

export default function FacultyAnalyticsPage() {
    const [view, setView] = useState<FacultyDashboardViewClient>("combined");
    const [data, setData] = useState<FacultyAnalyticsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appliedFilters, setAppliedFilters] = useState<FacultyAnalyticsFilters>(() => ({ ...EMPTY_FILTERS }));
    const [draftFilters, setDraftFilters] = useState<FacultyAnalyticsFilters>(() => ({ ...EMPTY_FILTERS }));
    const [courseOptions, setCourseOptions] = useState<{ id: string; label: string }[]>([]);

    const loadAnalytics = useCallback(async () => {
        if (typeof window !== "undefined") {
            const raw = new URLSearchParams(window.location.search).get("view");
            if (raw === "university" || raw === "personal" || raw === "combined") {
                writeFacultyDashboardViewPreference(raw);
            }
        }
        const v = readFacultyDashboardViewPreference();
        setView(v);
        setLoading(true);
        setError(null);
        try {
            const url = facultyAnalyticsApiUrl(v, appliedFilters);
            const res = await authenticatedFetch(url, {}, { redirectToLogin: true, timeoutMs: 60_000 });
            if (!res) return;
            if (res?.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setData(json.data as FacultyAnalyticsPayload);
                } else {
                    setError("Could not load analytics.");
                }
            } else {
                setError("Could not load analytics.");
            }
        } catch {
            setError("Could not load analytics.");
        } finally {
            setLoading(false);
        }
    }, [appliedFilters]);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    useEffect(() => {
        const onView = () => void loadAnalytics();
        window.addEventListener(CIEL_FACULTY_DASHBOARD_VIEW_EVENT, onView);
        return () => window.removeEventListener(CIEL_FACULTY_DASHBOARD_VIEW_EVENT, onView);
    }, [loadAnalytics]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authenticatedFetch(
                    resolveSameOriginApiPath(`/api/v1/faculty/dashboard?view=${encodeURIComponent(view)}`),
                    {},
                    { timeoutMs: 60_000 },
                );
                if (!res?.ok || cancelled) return;
                const json = await res.json().catch(() => ({}));
                const courses = (json?.data?.courses ?? []) as Array<{
                    id?: string;
                    title?: string;
                    code?: string;
                    semester?: string;
                }>;
                const opts = courses
                    .filter((c) => c.id)
                    .map((c) => ({
                        id: String(c.id),
                        label:
                            [c.code, c.semester, c.title]
                                .filter((x) => typeof x === "string" && x.trim())
                                .join(" · ") || "Course",
                    }));
                setCourseOptions(opts);
            } catch {
                /* optional dropdown */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [view]);

    const applyDraft = () => {
        setAppliedFilters({ ...draftFilters });
    };

    const clearFilters = () => {
        const cleared = { ...EMPTY_FILTERS };
        setDraftFilters(cleared);
        setAppliedFilters(cleared);
    };

    const hoursChart = useMemo(() => normalizeHoursTrend(data?.hours_trend), [data?.hours_trend]);
    const sdgChart = useMemo(() => normalizeDistribution(data?.impact_distribution), [data?.impact_distribution]);

    const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

    const viewLabel =
        view === "personal" ? "My supervision" : view === "university" ? "University scope" : "All activity";

    const filtersActive = Boolean(data?.filter_meta && data.filter_meta.active === true);
    const appliedSummary =
        data?.filter_meta && data.filter_meta.active === true ? data.filter_meta.params : null;

    const selectCls =
        "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
    const inputCls =
        "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

    if (loading && !data) {
        return (
            <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
                <div className="flex min-h-[200px] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Loading analytics…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
                <Link
                    href="/dashboard/faculty"
                    className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Faculty dashboard
                </Link>
                <Card>
                    <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href="/dashboard/faculty"
                        className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Faculty dashboard
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Analytics</h1>
                    <p className="text-slate-500">Track student engagement, verification, and SDG contribution.</p>
                    {data?.university_scope?.organization_name ? (
                        <p className="mt-2 text-xs font-semibold text-indigo-700">
                            Delegated org: {data.university_scope.organization_name}
                        </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                        Current scope: <strong className="text-slate-700">{viewLabel}</strong> — change it on the main faculty
                        dashboard; this page refreshes when you switch views.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-lg">Analytics filters</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={applyDraft}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Apply filters
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                    <CardDescription>
                        Narrow metrics within your faculty-assigned opportunities (AND). Leave empty for no constraint.
                        Selecting a specific project ignores the course/section search (matches backend).
                    </CardDescription>
                    {filtersActive && appliedSummary ? (
                        <p className="text-xs font-medium text-indigo-700">
                            Active:{" "}
                            {Object.entries(appliedSummary)
                                .map(([k, v]) => `${k}=${v}`)
                                .join(" · ")}
                        </p>
                    ) : null}
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block text-sm font-medium text-slate-700">
                        Course / section search
                        <input
                            className={inputCls}
                            placeholder="Code, term, or title contains…"
                            value={draftFilters.course_section}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, course_section: e.target.value }))}
                            disabled={Boolean(draftFilters.project_id.trim())}
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Project
                        <select
                            className={selectCls}
                            value={draftFilters.project_id}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, project_id: e.target.value }))}
                        >
                            <option value="">Any in scope</option>
                            {courseOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Degree program
                        <input
                            className={inputCls}
                            placeholder="Exact programme on enrolment"
                            value={draftFilters.degree_program}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, degree_program: e.target.value }))}
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Year of study
                        <select
                            className={selectCls}
                            value={draftFilters.year_of_study}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, year_of_study: e.target.value }))}
                        >
                            <option value="">Any</option>
                            {YEAR_OF_STUDY_OPTIONS.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Academic integration type
                        <select
                            className={selectCls}
                            value={draftFilters.academic_integration_type}
                            onChange={(e) =>
                                setDraftFilters((f) => ({ ...f, academic_integration_type: e.target.value }))
                            }
                        >
                            <option value="">Any</option>
                            {ACADEMIC_INTEGRATION_OPTIONS.map((x) => (
                                <option key={x} value={x}>
                                    {x}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Participation type
                        <select
                            className={selectCls}
                            value={draftFilters.participation_type}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, participation_type: e.target.value }))}
                        >
                            {PARTICIPATION_TYPE_OPTIONS.map((o) => (
                                <option key={o.value || "any"} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Verification status
                        <select
                            className={selectCls}
                            value={draftFilters.verification_status}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, verification_status: e.target.value }))}
                        >
                            {VERIFICATION_OPTIONS.map((o) => (
                                <option key={o.value || "any"} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Period start
                        <input
                            type="date"
                            className={inputCls}
                            value={draftFilters.period_start}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, period_start: e.target.value }))}
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Period end
                        <input
                            type="date"
                            className={inputCls}
                            value={draftFilters.period_end}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, period_end: e.target.value }))}
                        />
                    </label>
                </CardContent>
            </Card>

            {loading && data ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    Updating analytics…
                </div>
            ) : null}

            <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            title: "Total students",
                            value: n(data?.total_students_under_faculty).toLocaleString(),
                            icon: Users,
                            color: "bg-blue-50 text-blue-600",
                            sub: filtersActive ? "Distinct students in filtered enrolments." : undefined,
                        },
                        {
                            title: "Hours contributed",
                            value: Math.round(n(data?.hours_verified)).toLocaleString(),
                            icon: Clock,
                            color: "bg-purple-50 text-purple-600",
                            sub: filtersActive ? "Verified timesheets matching enrolment filters." : undefined,
                        },
                        {
                            title: "Projects (verified hours)",
                            value: n(data?.projects_completed).toLocaleString(),
                            icon: PieChartIcon,
                            color: "bg-green-50 text-green-600",
                            sub: filtersActive ? "Projects with verified hours in cohort." : undefined,
                        },
                        {
                            title: "Avg impact score",
                            value: n(data?.avg_impact_score) > 0 ? `${data?.avg_impact_score}/10` : "—",
                            icon: Award,
                            color: "bg-amber-50 text-amber-600",
                            sub: filtersActive ? "Reports matching enrolment filters." : undefined,
                        },
                    ].map((stat, i) => (
                        <Card key={i}>
                            <CardContent className="flex items-center justify-between gap-3 p-5 sm:p-6">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</h3>
                                    {stat.sub ? <p className="mt-1 text-xs text-slate-500">{stat.sub}</p> : null}
                                </div>
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                                >
                                    <stat.icon className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            title: "Verified students",
                            value: n(data?.verified_students).toLocaleString(),
                            sub: "Profile + identity verified",
                            icon: ShieldCheck,
                            color: "bg-emerald-50 text-emerald-700",
                        },
                        {
                            title: "Verification rate",
                            value: `${n(data?.verification_rate_percent)}%`,
                            sub: filtersActive ? "Within filtered cohort." : "Of students in this scope",
                            icon: ShieldCheck,
                            color: "bg-teal-50 text-teal-700",
                        },
                        {
                            title: "Individual enrollments",
                            value: n(data?.individual_participants).toLocaleString(),
                            sub: "Participation mode: individual",
                            icon: User,
                            color: "bg-slate-50 text-slate-700",
                        },
                        {
                            title: "Team enrollments",
                            value: n(data?.team_participants).toLocaleString(),
                            sub: `${n(data?.total_teams)} teams · avg size ${n(data?.average_team_size)}`,
                            icon: UsersRound,
                            color: "bg-indigo-50 text-indigo-700",
                        },
                        {
                            title: "Total required hours",
                            value: n(data?.total_required_hours).toLocaleString(),
                            sub: "Sum over active enrollments in scope",
                            icon: Clock,
                            color: "bg-orange-50 text-orange-700",
                        },
                        {
                            title: "Course-linked CE ratio",
                            value: `${n(data?.course_linked_ce_ratio_percent)}%`,
                            sub: "Students with course-linked / CE enrollment types",
                            icon: BookOpen,
                            color: "bg-cyan-50 text-cyan-700",
                        },
                    ].map((stat, i) => (
                        <Card key={i} className="border-slate-200/80">
                            <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.title}</p>
                                    <h3 className="mt-1 text-xl font-black text-slate-900">{stat.value}</h3>
                                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{stat.sub}</p>
                                </div>
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                                >
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>SDG distribution</CardTitle>
                            <CardDescription>
                                Which global goals show up in scoped projects and reports?
                                {filtersActive ? " Shown for the filtered cohort." : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {sdgChart.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sdgChart}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {sdgChart.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color || COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <ChartEmpty message="No SDG distribution data for this scope yet." />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Volunteer hours (monthly)</CardTitle>
                            <CardDescription>
                                Verified timesheet hours in scoped opportunities.
                                {filtersActive ? " Filtered by enrolment where applicable." : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {hoursChart.length ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hoursChart}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: "#f1f5f9" }} />
                                        <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <ChartEmpty message="No verified hours in the last months for this scope." />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-10">
                    <AnalyticsHub
                        views={[
                            {
                                id: "faculty",
                                label: "University",
                                apiPath: "/api/v1/faculty/analytics/section1",
                                query: {
                                    project_id: appliedFilters.project_id,
                                    degree_program: appliedFilters.degree_program,
                                    year_of_study: appliedFilters.year_of_study,
                                    academic_integration_type: appliedFilters.academic_integration_type,
                                    participation_type: appliedFilters.participation_type,
                                    verification_status: appliedFilters.verification_status,
                                    period_start: appliedFilters.period_start,
                                    period_end: appliedFilters.period_end,
                                    scope: appliedFilters.project_id ? "project" : "aggregate",
                                },
                            },
                        ]}
                        hideOnError
                    />
                </div>
            </>
        </div>
    );
}
