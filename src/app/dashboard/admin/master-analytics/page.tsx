"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Users,
    ShieldCheck,
    GraduationCap,
    Clock,
    TrendingUp,
    PieChart,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/app/dashboard/student/report/components/ui/card";
import { authenticatedFetch } from "@/utils/api";

type TypeMixRow = { participation_type: string; count: number };

type MasterAnalyticsData = {
    total_participants?: number;
    verified_students?: number;
    verification_rate_percent?: number;
    total_universities?: number;
    participation_type_mix?: TypeMixRow[];
    total_required_hours?: number;
    system_growth_rate_percent?: number | null;
    growth_meta?: {
        basis?: string;
        formula?: string;
        previous_total?: number;
        current_total?: number;
        previous_label?: string;
    };
};

function num(x: unknown): number {
    return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

export default function AdminMasterAnalyticsPage() {
    const [data, setData] = useState<MasterAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedFetch("/api/v1/admin/master-analytics", {}, { redirectToLogin: true });
            if (!res) return;
            if (res.status === 401 || res.status === 403) {
                setError("You do not have access to CIEL Master analytics.");
                setData(null);
                return;
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(typeof body?.message === "string" ? body.message : "Could not load master analytics.");
                return;
            }
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data as MasterAnalyticsData);
            } else {
                setError("Could not load master analytics.");
            }
        } catch {
            setError("Could not load master analytics.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className="flex min-h-[320px] items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Loading CIEL Master analytics…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-2xl space-y-4 p-4">
                <Link
                    href="/dashboard/admin"
                    className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Admin dashboard
                </Link>
                <Card>
                    <CardHeader>
                        <CardTitle>CIEL Master</CardTitle>
                        <CardDescription>Something went wrong.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">{error}</CardContent>
                </Card>
            </div>
        );
    }

    const mix = data?.participation_type_mix ?? [];
    const maxMix = Math.max(...mix.map((m) => m.count), 1);
    const growth = data?.system_growth_rate_percent;
    const growthLabel =
        growth == null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-0 lg:p-8">
            <div>
                <Link
                    href="/dashboard/admin"
                    className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Admin dashboard
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">CIEL Master</h1>
                <p className="mt-2 text-slate-600">
                    Platform-wide student footprint, verification, university diversity, participation mix, and required
                    hours.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Users className="h-5 w-5" />
                            <CardDescription>Total participants</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums">{num(data?.total_participants).toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">All student accounts on the platform.</CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <ShieldCheck className="h-5 w-5" />
                            <CardDescription>Verification rate</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums">
                            {num(data?.verification_rate_percent).toLocaleString()}%
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                        {num(data?.verified_students).toLocaleString()} verified (profile + identity) of{" "}
                        {num(data?.total_participants).toLocaleString()} students.
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <GraduationCap className="h-5 w-5" />
                            <CardDescription>Total universities</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums">
                            {num(data?.total_universities).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                        Distinct university names from student profiles and enrolment records.
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="h-5 w-5" />
                            <CardDescription>Total required hours</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums">
                            {num(data?.total_required_hours).toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                                minimumFractionDigits: Number.isInteger(data?.total_required_hours as number) ? 0 : 1,
                            })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                        Sum of per-student required hours on active participation rows (non-rejected).
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm sm:col-span-2 xl:col-span-1">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <TrendingUp className="h-5 w-5" />
                            <CardDescription>System growth rate</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums text-emerald-700">{growthLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-slate-600">
                        <p>
                            Versus student headcount before the start of this UTC month (
                            {num(data?.growth_meta?.previous_total).toLocaleString()} →{" "}
                            {num(data?.growth_meta?.current_total).toLocaleString()}).
                        </p>
                        {data?.growth_meta?.previous_total === 0 ? (
                            <p className="text-amber-800">No prior-month baseline yet; rate is not defined.</p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-slate-600" />
                        <CardTitle className="text-lg">Participation type mix</CardTitle>
                    </div>
                    <CardDescription>Enrolments by individual vs team (non-rejected pipeline statuses).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {mix.length === 0 ? (
                        <p className="text-sm text-slate-500">No participation rows in scope yet.</p>
                    ) : (
                        mix.map((row) => {
                            const pct = (row.count / maxMix) * 100;
                            const label =
                                row.participation_type === "team"
                                    ? "Team"
                                    : row.participation_type === "individual"
                                      ? "Individual"
                                      : row.participation_type;
                            return (
                                <div key={row.participation_type} className="space-y-1">
                                    <div className="flex justify-between text-sm font-semibold text-slate-800">
                                        <span>{label}</span>
                                        <span className="tabular-nums">{row.count.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-indigo-500 transition-[width]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
