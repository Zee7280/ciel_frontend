"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ChevronDown,
    Download,
    Filter,
    Loader2,
    RefreshCw,
    RotateCcw,
    X,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import AnalyticsHub from "@/components/analytics/AnalyticsHub";
import UnifiedAnalyticsOverview from "@/components/analytics/UnifiedAnalyticsOverview";
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

const SDG_BAR_COLORS = ["#e11d48", "#f97316", "#0f766e", "#84cc16", "#2563eb", "#7c3aed", "#0891b2", "#b45309"];

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

const FILTER_CHIP_LABELS: Record<keyof FacultyAnalyticsFilters, string> = {
    project_id: "Project",
    course_section: "Course",
    degree_program: "Programme",
    year_of_study: "Year",
    academic_integration_type: "Integration",
    participation_type: "Participation",
    verification_status: "Verification",
    period_start: "From",
    period_end: "To",
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

function n(x: unknown) {
    return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

function formatNum(x: number, digits = 0) {
    return x.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

type KpiCard = {
    label: string;
    value: string;
    hint: string;
    warn?: boolean;
};

function buildContradictions(data: FacultyAnalyticsPayload): string[] {
    const notes: string[] = [];
    const students = n(data.total_students_under_faculty);
    const enrolments = n(data.individual_participants) + n(data.team_participants);
    if (students > 0 && enrolments > 0 && students !== enrolments) {
        const gap = Math.abs(enrolments - students);
        notes.push(
            `Students: ${formatNum(students)} in scope vs ${formatNum(enrolments)} enrolments — ${formatNum(gap)} unaccounted.`,
        );
    }
    const required = n(data.total_required_hours);
    const verified = n(data.hours_verified);
    if (required > 0 && verified === 0) {
        notes.push(`Hours: required total is ${formatNum(required, 1)} h but verified hours are 0.`);
    }
    const score = n(data.avg_impact_score);
    if (score > 10) {
        notes.push(`Impact score averages ${score} (this is not a /10 scale).`);
    }
    return notes;
}

export default function FacultyAnalyticsPage() {
    const [view, setView] = useState<FacultyDashboardViewClient>("combined");
    const [data, setData] = useState<FacultyAnalyticsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appliedFilters, setAppliedFilters] = useState<FacultyAnalyticsFilters>(() => ({ ...EMPTY_FILTERS }));
    const [draftFilters, setDraftFilters] = useState<FacultyAnalyticsFilters>(() => ({ ...EMPTY_FILTERS }));
    const [courseOptions, setCourseOptions] = useState<{ id: string; label: string }[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);

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
        setFiltersOpen(false);
    };

    const clearFilters = () => {
        const cleared = { ...EMPTY_FILTERS };
        setDraftFilters(cleared);
        setAppliedFilters(cleared);
    };

    const hoursChart = useMemo(() => normalizeHoursTrend(data?.hours_trend), [data?.hours_trend]);
    const sdgChart = useMemo(() => {
        const rows = normalizeDistribution(data?.impact_distribution).filter((d) => d.value > 0);
        return [...rows].sort((a, b) => b.value - a.value);
    }, [data?.impact_distribution]);

    const viewLabel =
        view === "personal" ? "My supervision" : view === "university" ? "University scope" : "All activity";

    const activeFilterChips = useMemo(() => {
        return (Object.entries(appliedFilters) as [keyof FacultyAnalyticsFilters, string][])
            .filter(([, value]) => value.trim())
            .map(([key, value]) => ({
                key,
                label: `${FILTER_CHIP_LABELS[key]}: ${
                    key === "project_id" ? courseOptions.find((c) => c.id === value)?.label || value : value
                }`,
            }));
    }, [appliedFilters, courseOptions]);

    const contradictions = useMemo(() => (data ? buildContradictions(data) : []), [data]);

    const kpis: KpiCard[] = data
        ? [
              {
                  label: "Students in scope",
                  value: formatNum(n(data.total_students_under_faculty)),
                  hint: (() => {
                      const enrol = n(data.individual_participants) + n(data.team_participants);
                      const students = n(data.total_students_under_faculty);
                      if (enrol > 0 && students !== enrol) {
                          return `Enrolments total ${formatNum(enrol)} — ${formatNum(Math.abs(enrol - students))} unaccounted`;
                      }
                      return enrol > 0 ? `${formatNum(enrol)} enrolments in this scope` : "Distinct students on assigned opportunities";
                  })(),
                  warn:
                      n(data.total_students_under_faculty) > 0 &&
                      n(data.individual_participants) + n(data.team_participants) > 0 &&
                      n(data.total_students_under_faculty) !==
                          n(data.individual_participants) + n(data.team_participants),
              },
              {
                  label: "Verified hours",
                  value: formatNum(Math.round(n(data.hours_verified))),
                  hint:
                      n(data.total_required_hours) > 0
                          ? `Required across enrolments: ${formatNum(n(data.total_required_hours), 1)} h`
                          : "Verified timesheet hours in scope",
                  warn: n(data.total_required_hours) > 0 && n(data.hours_verified) === 0,
              },
              {
                  label: "Identity verified",
                  value: `${n(data.verification_rate_percent)}%`,
                  hint: `${formatNum(n(data.verified_students))} of ${formatNum(n(data.total_students_under_faculty))} students`,
              },
              {
                  label: "Projects with hours",
                  value: formatNum(n(data.projects_completed)),
                  hint: "Opportunities that already have verified hours",
              },
              {
                  label: "Required hours",
                  value: formatNum(n(data.total_required_hours), 1),
                  hint: "Summed across active enrolments",
              },
              {
                  label: "Teams",
                  value: formatNum(n(data.total_teams)),
                  hint: `${formatNum(n(data.team_participants))} team enrolments · avg ${n(data.average_team_size)} students`,
              },
              {
                  label: "Course-linked",
                  value: `${n(data.course_linked_ce_ratio_percent)}%`,
                  hint: "of enrolments carry course credit",
              },
              {
                  label: "Avg impact score",
                  value: n(data.avg_impact_score) > 0 ? String(n(data.avg_impact_score)) : "—",
                  hint: n(data.avg_impact_score) > 10 ? "Cohort mean from AI impact score" : "Cohort mean from submitted reports",
              },
          ]
        : [];

    const exportCsv = () => {
        if (!data) return;
        const lines = [
            ["Metric", "Value"],
            ["Scope", viewLabel],
            ...kpis.map((k) => [k.label, `${k.value} (${k.hint})`]),
        ];
        const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `faculty-analytics-${view}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const selectCls =
        "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20";
    const inputCls = selectCls;
    const btnGhost =
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";

    const sdgMax = Math.max(...sdgChart.map((d) => d.value), 1);
    const hubSubtitle = [
        data?.university_scope?.organization_name,
        viewLabel,
        appliedFilters.project_id ? "project filter" : "aggregate cohort",
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="mx-auto max-w-6xl space-y-5 p-0 pb-20 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Analytics</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Engagement, verification and SDG contribution across your assigned opportunities.
                    </p>
                    {data?.university_scope?.organization_name ? (
                        <p className="mt-1 text-xs font-medium text-teal-800">
                            Delegated org: {data.university_scope.organization_name}
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={exportCsv} disabled={!data} className={btnGhost}>
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                    <button type="button" onClick={() => void loadAnalytics()} disabled={loading} className={btnGhost}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Scope</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {viewLabel}
                        </span>
                        {activeFilterChips.map((chip) => (
                            <span
                                key={chip.key}
                                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900"
                            >
                                {chip.label}
                                <button
                                    type="button"
                                    aria-label={`Remove ${chip.label}`}
                                    onClick={() => {
                                        const next = { ...appliedFilters, [chip.key]: "" };
                                        setDraftFilters(next);
                                        setAppliedFilters(next);
                                    }}
                                    className="rounded-full p-0.5 hover:bg-teal-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <button type="button" onClick={() => setFiltersOpen((open) => !open)} className={btnGhost}>
                        <Filter className="h-4 w-4" />
                        {filtersOpen ? "Hide filters" : "Add filters"}
                        <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {filtersOpen ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                        <p className="mb-3 text-xs text-slate-500">
                            Narrow metrics within your faculty-assigned opportunities. Leave empty for no constraint.
                            A specific project ignores the course/section search.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={applyDraft}
                                disabled={loading}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Apply filters
                            </button>
                            <button type="button" onClick={clearFilters} disabled={loading} className={btnGhost}>
                                <RotateCcw className="h-4 w-4" />
                                Clear
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    Engagement overview could not be loaded ({error}). Report analytics below still work independently.
                </div>
            ) : null}

            {contradictions.length > 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-rose-950">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        Some numbers on this page contradict each other
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-rose-800">
                        {contradictions.map((note) => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Link href="/dashboard/faculty/attendance-review" className={btnGhost}>
                            Reconcile hours
                        </Link>
                        <Link href="/dashboard/faculty/join-applications" className={btnGhost}>
                            Check the data source
                        </Link>
                    </div>
                </div>
            ) : null}

            {loading && !data ? (
                <div className="flex min-h-[120px] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                    <span className="text-sm font-medium">Loading engagement overview…</span>
                </div>
            ) : null}

            {loading && data ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating analytics…
                </p>
            ) : null}

            {data ? (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {kpis.map((stat) => (
                            <article key={stat.label} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                                <p className="mt-1 text-[28px] font-bold leading-none tabular-nums tracking-tight text-slate-900">
                                    {stat.value}
                                </p>
                                <p className={`mt-2 text-xs leading-snug ${stat.warn ? "font-medium text-rose-600" : "text-slate-500"}`}>
                                    {stat.hint}
                                </p>
                            </article>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="text-sm font-semibold text-slate-900">SDG distribution</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Goals appearing in scoped projects and reports.</p>
                            {sdgChart.length ? (
                                <ul className="mt-4 space-y-2.5">
                                    {sdgChart.map((row, index) => (
                                        <li key={row.name} className="flex items-center gap-3">
                                            <span className="w-36 shrink-0 truncate text-[13px] text-slate-600" title={row.name}>
                                                {row.name}
                                            </span>
                                            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${Math.max(4, (row.value / sdgMax) * 100)}%`,
                                                        background: row.color || SDG_BAR_COLORS[index % SDG_BAR_COLORS.length],
                                                    }}
                                                />
                                            </div>
                                            <span className="w-8 shrink-0 text-right text-[13px] font-semibold tabular-nums text-slate-800">
                                                {row.value}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-8 text-center text-sm text-slate-500">No SDG tags in this scope yet.</p>
                            )}
                        </article>

                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="text-sm font-semibold text-slate-900">Verified hours by month</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Timesheet hours on assigned opportunities.</p>
                            {hoursChart.some((p) => p.hours > 0) ? (
                                <div className="mt-2 h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={hoursChart}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} width={36} />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 8,
                                                    border: "1px solid #e2e8f0",
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                                                {hoursChart.map((entry) => (
                                                    <Cell key={entry.name} fill="#0f766e" />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="mt-10 px-4 py-8 text-center">
                                    <p className="text-sm font-medium text-slate-700">Nothing to plot yet</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Verified hours appear after attendance is approved. Check{" "}
                                        <Link href="/dashboard/faculty/join-applications" className="font-semibold text-teal-800 hover:underline">
                                            Applications &amp; reports
                                        </Link>
                                        {" "}or{" "}
                                        <Link href="/dashboard/faculty/attendance-review" className="font-semibold text-teal-800 hover:underline">
                                            Attendance review
                                        </Link>
                                        .
                                    </p>
                                </div>
                            )}
                        </article>
                    </div>
                </>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <UnifiedAnalyticsOverview
                    apiPath="/api/v1/faculty/analytics/overview"
                    query={{
                        project_id: appliedFilters.project_id || undefined,
                        scope: appliedFilters.project_id ? "project" : "aggregate",
                    }}
                    title="Report overview"
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-4">
                    <h2 className="text-base font-semibold tracking-tight text-slate-900">Report analytics by section</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{hubSubtitle || "Aggregate cohort"}</p>
                </div>
                <AnalyticsHub
                    views={[
                        {
                            id: "faculty",
                            label: "Faculty",
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
                    hideOnError={false}
                />
            </div>
        </div>
    );
}
