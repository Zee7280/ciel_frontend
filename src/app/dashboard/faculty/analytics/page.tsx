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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { authenticatedFetch } from "@/utils/api";
import {
    CIEL_FACULTY_DASHBOARD_VIEW_EVENT,
    readFacultyDashboardViewPreference,
    writeFacultyDashboardViewPreference,
    type FacultyDashboardViewClient,
} from "@/utils/facultyScopeSession";

type TrendPoint = { label?: string; month?: string; name?: string; hours?: number; value?: number };
type DistributionPoint = { name?: string; label?: string; value?: number; count?: number; color?: string };

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

    const load = useCallback(async () => {
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
            const res = await authenticatedFetch(`/api/v1/faculty/analytics?view=${encodeURIComponent(v)}`);
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
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const onView = () => void load();
        window.addEventListener(CIEL_FACULTY_DASHBOARD_VIEW_EVENT, onView);
        return () => window.removeEventListener(CIEL_FACULTY_DASHBOARD_VIEW_EVENT, onView);
    }, [load]);

    const hoursChart = useMemo(() => normalizeHoursTrend(data?.hours_trend), [data?.hours_trend]);
    const sdgChart = useMemo(() => normalizeDistribution(data?.impact_distribution), [data?.impact_distribution]);

    const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

    const viewLabel =
        view === "personal" ? "My supervision" : view === "university" ? "University scope" : "All activity";

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
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Department Impact Analytics</h1>
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

            {loading ? (
                <div className="flex min-h-[200px] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Loading analytics…</span>
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                title: "Total students",
                                value: n(data?.total_students_under_faculty).toLocaleString(),
                                icon: Users,
                                color: "bg-blue-50 text-blue-600",
                            },
                            {
                                title: "Hours contributed",
                                value: Math.round(n(data?.hours_verified)).toLocaleString(),
                                icon: Clock,
                                color: "bg-purple-50 text-purple-600",
                            },
                            {
                                title: "Projects (verified hours)",
                                value: n(data?.projects_completed).toLocaleString(),
                                icon: PieChartIcon,
                                color: "bg-green-50 text-green-600",
                            },
                            {
                                title: "Avg impact score",
                                value: n(data?.avg_impact_score) > 0 ? `${data?.avg_impact_score}/10` : "—",
                                icon: Award,
                                color: "bg-amber-50 text-amber-600",
                            },
                        ].map((stat, i) => (
                            <Card key={i}>
                                <CardContent className="flex items-center justify-between gap-3 p-5 sm:p-6">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                        <h3 className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</h3>
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
                                sub: "Of students in this scope",
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
                                sub: "Sum over active enrollments",
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
                                <CardDescription>Which global goals show up in scoped projects and reports?</CardDescription>
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
                                <CardDescription>Verified timesheet hours in scoped opportunities.</CardDescription>
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
                </>
            )}
        </div>
    );
}
