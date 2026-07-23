"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Users,
    ShieldCheck,
    User,
    UsersRound,
    Clock,
    GraduationCap,
    CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/student/report/components/ui/card";
import { authenticatedFetch } from "@/utils/api";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";

type DegreeRow = { degree: string; count: number };
type YearRow = { year_of_study: string; count: number };

type UniversityAnalyticsData = {
    organization_id?: string;
    organization_name?: string;
    total_participants?: number;
    total_distinct_students?: number;
    verified_students?: number;
    verification_rate_percent?: number;
    degree_participation?: DegreeRow[];
    year_participation?: YearRow[];
    individual_participation_percent?: number;
    team_participation_percent?: number;
    total_required_hours?: number;
};

function n(x: unknown): number {
    return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

export default function PartnerUniversityAnalyticsPage() {
    const [data, setData] = useState<UniversityAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setForbidden(false);
        try {
            const res = await authenticatedFetch("/api/v1/partners/university/analytics", {}, { redirectToLogin: true });
            if (!res) return;
            if (res.status === 403) {
                setForbidden(true);
                setData(null);
                return;
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(typeof body?.message === "string" ? body.message : "Could not load analytics.");
                return;
            }
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data as UniversityAnalyticsData);
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

    if (forbidden) {
        return (
            <div className="mx-auto max-w-2xl space-y-4 p-4">
                <Link
                    href="/dashboard/partner"
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Partner dashboard
                </Link>
                <Card>
                    <CardHeader>
                        <CardTitle>Institution analytics</CardTitle>
                        <CardDescription>Only available for university partner accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                        Your organization profile is not typed as a university in CIEL, so this report is hidden. Other partner
                        tools are unchanged.
                    </CardContent>
                </Card>
            </div>
        );
    }

    const degrees = data?.degree_participation ?? [];
    const years = data?.year_participation ?? [];

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-16">
            <div>
                <Link
                    href="/dashboard/partner"
                    className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Partner dashboard
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Institution analytics</h1>
                <p className="text-slate-500">
                    Participation, verification, and academic breakdown for{" "}
                    <span className="font-semibold text-slate-700">{data?.organization_name || "your university"}</span>.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Includes enrollments tied to your org via student profile, opportunity ownership, or enrollment{" "}
                    <code className="rounded bg-slate-100 px-1">universityId</code>.
                </p>
            </div>

            {error ? (
                <Card className="border-rose-200 bg-rose-50/70">
                    <CardContent className="p-4 text-sm text-rose-700">
                        Enrollment overview could not be loaded ({error}). Report analytics below still work independently.
                    </CardContent>
                </Card>
            ) : null}

            {loading && !data ? (
                <div className="flex min-h-[100px] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Loading enrollment overview…</span>
                </div>
            ) : null}

            {data ? (
                <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        title: "Total participants",
                        value: n(data?.total_participants).toLocaleString(),
                        hint: "Enrollment rows (active pipeline)",
                        icon: Users,
                        color: "bg-blue-50 text-blue-700",
                    },
                    {
                        title: "Distinct students",
                        value: n(data?.total_distinct_students).toLocaleString(),
                        hint: "Unique students in scope",
                        icon: GraduationCap,
                        color: "bg-violet-50 text-violet-700",
                    },
                    {
                        title: "Verification rate",
                        value: `${n(data?.verification_rate_percent)}%`,
                        hint: `${n(data?.verified_students).toLocaleString()} fully verified`,
                        icon: ShieldCheck,
                        color: "bg-emerald-50 text-emerald-700",
                    },
                    {
                        title: "Total required hours",
                        value: n(data?.total_required_hours).toLocaleString(),
                        hint: "Sum of required hours per enrollment",
                        icon: Clock,
                        color: "bg-amber-50 text-amber-800",
                    },
                ].map((s, i) => (
                    <Card key={i} className="border-slate-200/80">
                        <CardContent className="flex items-start justify-between gap-3 p-5">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.title}</p>
                                <p className="mt-1 text-2xl font-black text-slate-900">{s.value}</p>
                                <p className="mt-1 text-[11px] text-slate-500">{s.hint}</p>
                            </div>
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                                <s.icon className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="flex items-start justify-between gap-4 p-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Individual</p>
                            <p className="mt-1 text-2xl font-black text-slate-900">{n(data?.individual_participation_percent)}%</p>
                            <p className="text-xs text-slate-500">Share of enrollment rows</p>
                        </div>
                        <div className={`rounded-xl bg-slate-50 p-3 text-slate-700`}>
                            <User className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-start justify-between gap-4 p-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Team</p>
                            <p className="mt-1 text-2xl font-black text-slate-900">{n(data?.team_participation_percent)}%</p>
                            <p className="text-xs text-slate-500">Share of enrollment rows</p>
                        </div>
                        <div className={`rounded-xl bg-indigo-50 p-3 text-indigo-700`}>
                            <UsersRound className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <GraduationCap className="h-5 w-5 text-violet-600" />
                            Degree / program
                        </CardTitle>
                        <CardDescription>Participation count by academic program (registration).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {degrees.length ? (
                            <ul className="divide-y divide-slate-100">
                                {degrees.map((row) => (
                                    <li key={row.degree} className="flex items-center justify-between py-2 text-sm">
                                        <span className="font-medium text-slate-800">{row.degree}</span>
                                        <span className="tabular-nums font-bold text-slate-600">{row.count}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">No program data in this scope yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarDays className="h-5 w-5 text-teal-600" />
                            Year of study
                        </CardTitle>
                        <CardDescription>Participation count by year level.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {years.length ? (
                            <ul className="divide-y divide-slate-100">
                                {years.map((row) => (
                                    <li key={row.year_of_study} className="flex items-center justify-between py-2 text-sm">
                                        <span className="font-medium text-slate-800">{row.year_of_study}</span>
                                        <span className="tabular-nums font-bold text-slate-600">{row.count}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">No year-of-study data in this scope yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
                </>
            ) : null}

            <div className="border-t border-slate-200 pt-10">
                <UnifiedAnalyticsOverview
                    apiPath="/api/v1/partners/university/analytics/overview"
                    query={{ scope: "aggregate" }}
                    title="Institution report overview"
                />
            </div>

            <div className="border-t border-slate-200 pt-10">
                <h2 className="mb-2 text-lg font-bold text-slate-900">Report analytics (Sections 1–10)</h2>
                <p className="mb-4 text-sm text-slate-500">
                    Institution-scoped metrics from student reports — same hub as partner/admin/faculty analytics.
                </p>
                <AnalyticsHub
                    views={[
                        {
                            id: "university",
                            label: "University",
                            apiPath: "/api/v1/partners/university/analytics/section1",
                            query: { scope: "aggregate" },
                        },
                    ]}
                    hideOnError={false}
                />
            </div>
        </div>
    );
}
