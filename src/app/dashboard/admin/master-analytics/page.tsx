"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    Filter,
    RotateCcw,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/app/dashboard/student/report/components/ui/card";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import Section1AnalyticsPanel from "@/components/analytics/Section1AnalyticsPanel";

type TypeMixRow = { participation_type: string; count: number };

type FilterMeta =
    | { active: false }
    | { active: true; params: Record<string, string> };

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
        formula?: string | null;
        previous_total?: number | null;
        current_total?: number | null;
        previous_label?: string | null;
        note?: string | null;
    };
    filter_meta?: FilterMeta;
};

/** Mirrors backend `Participation` enums / query DTO. */
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

type MasterDashboardFilters = {
    university: string;
    degree_program: string;
    year_of_study: string;
    academic_integration_type: string;
    participation_type: string;
    project_id: string;
    faculty_email: string;
    partner_organization_id: string;
    verification_status: string;
    period_start: string;
    period_end: string;
};

const EMPTY_FILTERS: MasterDashboardFilters = {
    university: "",
    degree_program: "",
    year_of_study: "",
    academic_integration_type: "",
    participation_type: "",
    project_id: "",
    faculty_email: "",
    partner_organization_id: "",
    verification_status: "",
    period_start: "",
    period_end: "",
};

function num(x: unknown): number {
    return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

function masterAnalyticsUrl(filters: MasterDashboardFilters): string {
    const base = resolveSameOriginApiPath("/api/v1/admin/master-analytics");
    const u = new URL(base);
    (Object.entries(filters) as [keyof MasterDashboardFilters, string][]).forEach(([key, value]) => {
        const v = value.trim();
        if (v) u.searchParams.set(key, v);
    });
    return u.toString();
}

export default function AdminMasterAnalyticsPage() {
    const [data, setData] = useState<MasterAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draftFilters, setDraftFilters] = useState<MasterDashboardFilters>(() => ({ ...EMPTY_FILTERS }));
    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);

    const load = useCallback(async (applied: MasterDashboardFilters) => {
        setLoading(true);
        setError(null);
        try {
            const url = masterAnalyticsUrl(applied);
            const res = await authenticatedFetch(url, {}, { redirectToLogin: true, timeoutMs: 60_000 });
            if (!res) return;
            if (res.status === 401 || res.status === 403) {
                setError("You do not have access to CIEL Master analytics.");
                setData(null);
                return;
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                const msg =
                    typeof body?.message === "string"
                        ? body.message
                        : Array.isArray(body?.message)
                          ? body.message.join(", ")
                          : "Could not load master analytics.";
                setError(msg);
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
        void load(EMPTY_FILTERS);
    }, [load]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [prRes, orgRes] = await Promise.all([
                    authenticatedFetch(resolveSameOriginApiPath("/api/v1/admin/projects"), {}, { timeoutMs: 60_000 }),
                    authenticatedFetch(resolveSameOriginApiPath("/api/v1/admin/organizations"), {}, { timeoutMs: 60_000 }),
                ]);
                if (cancelled) return;

                const projectsOut: { id: string; title: string }[] = [];
                if (prRes?.ok) {
                    const body = await prRes.json().catch(() => ({}));
                    const raw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
                    for (const row of raw as Record<string, unknown>[]) {
                        const id = String(row.id ?? "").trim();
                        const title = String(row.title ?? row.name ?? "Untitled").trim();
                        if (id) projectsOut.push({ id, title });
                    }
                }

                const orgsOut: { id: string; name: string }[] = [];
                if (orgRes?.ok) {
                    const data = await orgRes.json().catch(() => ({}));
                    const raw = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
                    for (const row of raw as Record<string, unknown>[]) {
                        const id = String(row.id ?? "").trim();
                        const name = String(row.name ?? row.title ?? "Organization").trim();
                        if (id) orgsOut.push({ id, name });
                    }
                }

                setProjects(projectsOut.sort((a, b) => a.title.localeCompare(b.title)));
                setOrganizations(orgsOut.sort((a, b) => a.name.localeCompare(b.name)));
            } catch {
                /* dropdowns optional */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtersActive = Boolean(data?.filter_meta && data.filter_meta.active === true);

    const appliedSummary = useMemo(() => {
        if (!data?.filter_meta || data.filter_meta.active !== true) return null;
        return data.filter_meta.params;
    }, [data]);

    const applyDraft = () => {
        void load(draftFilters);
    };

    const clearFilters = () => {
        const cleared = { ...EMPTY_FILTERS };
        setDraftFilters(cleared);
        void load(cleared);
    };

    if (loading && !data) {
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

    const selectCls =
        "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
    const inputCls =
        "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

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
                    hours. Use filters to narrow metrics to matching enrolments (AND logic).
                </p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-lg">Dashboard filters</CardTitle>
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
                        Filters apply to participation rows (non-rejected pipeline). Leave fields empty for no constraint
                        on that dimension.
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
                        University
                        <input
                            className={inputCls}
                            placeholder="Exact name as on enrolment"
                            value={draftFilters.university}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, university: e.target.value }))}
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Degree program
                        <input
                            className={inputCls}
                            placeholder="Exact programme label"
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
                        Project
                        <select
                            className={selectCls}
                            value={draftFilters.project_id}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, project_id: e.target.value }))}
                        >
                            <option value="">Any</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Faculty email
                        <input
                            type="email"
                            className={inputCls}
                            placeholder="Matches primary / supervisor / secondary"
                            value={draftFilters.faculty_email}
                            onChange={(e) => setDraftFilters((f) => ({ ...f, faculty_email: e.target.value }))}
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Partner organization
                        <select
                            className={selectCls}
                            value={draftFilters.partner_organization_id}
                            onChange={(e) =>
                                setDraftFilters((f) => ({ ...f, partner_organization_id: e.target.value }))
                            }
                        >
                            <option value="">Any</option>
                            {organizations.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
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
                    Updating metrics…
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Users className="h-5 w-5" />
                            <CardDescription>Total participants</CardDescription>
                        </div>
                        <CardTitle className="text-3xl tabular-nums">{num(data?.total_participants).toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600">
                        {filtersActive
                            ? "Distinct students with at least one matching enrolment row."
                            : "All student accounts on the platform."}
                    </CardContent>
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
                        {num(data?.total_participants).toLocaleString()} students
                        {filtersActive ? " in this cohort." : "."}
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
                        {filtersActive
                            ? "Distinct university names on filtered enrolments."
                            : "Distinct university names from student profiles and enrolment records."}
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
                        Sum of per-student required hours on enrolments in scope (non-rejected pipeline statuses).
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
                        {filtersActive ? (
                            <p>{data?.growth_meta?.note ?? "Growth rate is not computed when filters are applied."}</p>
                        ) : (
                            <>
                                <p>
                                    Versus student headcount before the start of this UTC month (
                                    {num(data?.growth_meta?.previous_total).toLocaleString()} →{" "}
                                    {num(data?.growth_meta?.current_total).toLocaleString()}).
                                </p>
                                {data?.growth_meta?.previous_total === 0 ? (
                                    <p className="text-amber-800">No prior-month baseline yet; rate is not defined.</p>
                                ) : null}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-slate-600" />
                        <CardTitle className="text-lg">Participation type mix</CardTitle>
                    </div>
                    <CardDescription>
                        Enrolments by individual vs team (non-rejected pipeline statuses).
                        {filtersActive ? " Shown for the filtered cohort." : ""}
                    </CardDescription>
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

            <Section1AnalyticsPanel
                apiPath="/api/v1/admin/analytics/section1"
                query={{
                    ...(appliedSummary ?? {}),
                    scope: appliedSummary?.project_id ? "project" : "aggregate",
                }}
                title="Participation & attendance (CIEL)"
                description="Full admin field set. Respects the same filters as Master Analytics above."
                className="mt-8"
            />
        </div>
    );
}
