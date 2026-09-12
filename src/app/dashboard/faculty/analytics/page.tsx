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
import { FACULTY_HERO, MockupHero } from "@/components/ciel/dashboard/MockupChrome";
import { readStoredCurrentUser } from "@/utils/currentUser";
import {
    CIEL_FACULTY_DASHBOARD_VIEW_EVENT,
    readFacultyDashboardViewPreference,
    readFacultyScopeSession,
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

/** Same hourly rate as the public community ledger. */
const DIVIDEND_HOURLY_RATE_PKR = 192;

function formatPkr(amount: number) {
    return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
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
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [facultyName, setFacultyName] = useState("Faculty");
    const [department, setDepartment] = useState("");

    useEffect(() => {
        const user = readStoredCurrentUser();
        const name = typeof user?.name === "string" ? user.name.trim() : "";
        setFacultyName(name || "Faculty");
        const scope = readFacultyScopeSession()?.organization_name?.trim();
        const fromUser = [user?.department, user?.school, user?.university, user?.institution, user?.organization_name].find(
            (value) => typeof value === "string" && value.trim(),
        );
        setDepartment(scope || (typeof fromUser === "string" ? fromUser.trim() : ""));
    }, []);

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

    const verifiedHours = Math.round(n(data?.hours_verified));
    const kpis: KpiCard[] = data
        ? [
              {
                  label: "Projects in scope",
                  value: formatNum(n(data.projects_completed)),
                  hint: "Opportunities that already have verified hours",
              },
              {
                  label: "Students",
                  value: formatNum(n(data.total_students_under_faculty)),
                  hint: (() => {
                      const enrol = n(data.individual_participants) + n(data.team_participants);
                      const students = n(data.total_students_under_faculty);
                      if (enrol > 0 && students !== enrol) {
                          return `Enrolments total ${formatNum(enrol)} — ${formatNum(Math.abs(enrol - students))} unaccounted`;
                      }
                      return enrol > 0 ? `${formatNum(enrol)} unique participants` : "Distinct students on assigned opportunities";
                  })(),
                  warn:
                      n(data.total_students_under_faculty) > 0 &&
                      n(data.individual_participants) + n(data.team_participants) > 0 &&
                      n(data.total_students_under_faculty) !==
                          n(data.individual_participants) + n(data.team_participants),
              },
              {
                  label: "Verified person-hours",
                  value: `${formatNum(verifiedHours)}h`,
                  hint:
                      n(data.total_required_hours) > 0
                          ? `Required across enrolments: ${formatNum(n(data.total_required_hours), 1)} h`
                          : "Verified timesheet hours in scope",
                  warn: n(data.total_required_hours) > 0 && verifiedHours === 0,
              },
              {
                  label: "Community Dividend",
                  value: formatPkr(verifiedHours * DIVIDEND_HOURLY_RATE_PKR),
                  hint: `@ PKR ${DIVIDEND_HOURLY_RATE_PKR}/h (verified hours only — not wages paid)`,
              },
              {
                  label: "Identity verified",
                  value: `${n(data.verification_rate_percent)}%`,
                  hint: `${formatNum(n(data.verified_students))} of ${formatNum(n(data.total_students_under_faculty))} students`,
              },
              {
                  label: "Average Verified CII",
                  value: n(data.avg_impact_score) > 0 ? String(n(data.avg_impact_score)) : "—",
                  hint: n(data.avg_impact_score) > 10 ? "Cohort mean from AI impact score" : "Cohort mean from submitted reports",
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

    const kicker = department
        ? `CIEL PK · FACULTY · ${department.toUpperCase()}`
        : "CIEL PK · FACULTY";

    return (
        <div className="mx-auto max-w-[1500px] pb-16">
            <p className="text-[13px] text-[#71828e]">
                Faculty Dashboard / <b className="font-semibold text-[#183140]">Analytics</b>
            </p>
            <MockupHero
                kicker={kicker}
                title={facultyName}
                subtitle="Aggregated from live records in your supervision scope. Community Dividend = verified volunteer hours × PKR 192 (not wages paid)."
                gradient={FACULTY_HERO}
                stats={
                    data
                        ? [
                              { value: formatNum(n(data.total_students_under_faculty)), label: "Students" },
                              { value: formatNum(Math.round(n(data.hours_verified))), label: "Verified hours" },
                              { value: `${n(data.verification_rate_percent)}%`, label: "Identity verified" },
                              { value: formatNum(n(data.projects_completed)), label: "Projects with hours" },
                          ]
                        : [
                              { value: loading ? "…" : "0", label: "Students" },
                              { value: loading ? "…" : "0", label: "Verified hours" },
                              { value: loading ? "…" : "0%", label: "Identity verified" },
                              { value: loading ? "…" : "0", label: "Projects with hours" },
                          ]
                }
                rightStat={{ value: "👩‍🏫", label: "" }}
            />

            <div className="mt-4 overflow-hidden rounded-[20px] border border-[#dce6ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.04)]">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Scope</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {viewLabel}
                        </span>
                        {data?.university_scope?.organization_name ? (
                            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                                {data.university_scope.organization_name}
                            </span>
                        ) : null}
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
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setFiltersOpen((open) => !open)} className={btnGhost}>
                            <Filter className="h-4 w-4" />
                            {filtersOpen ? "Hide filters" : "Filters"}
                            <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? "rotate-180" : ""}`} />
                        </button>
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

                {filtersOpen ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                        <p className="mb-3 text-xs text-slate-500">
                            Narrow metrics within your faculty-assigned opportunities. Leave empty for no constraint.
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
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    Could not load analytics ({error}).
                </div>
            ) : null}

            {contradictions.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Some figures still need reconciling
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-amber-900">
                        {contradictions.map((note) => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Link href="/dashboard/faculty/attendance-review" className={btnGhost}>
                            Reconcile hours
                        </Link>
                        <Link href="/dashboard/faculty/join-applications" className={btnGhost}>
                            Check enrolments
                        </Link>
                    </div>
                </div>
            ) : null}

            {loading && data ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating analytics…
                </p>
            ) : null}

            {loading && !data ? (
                <div className="mt-8 flex min-h-[120px] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                    <span className="text-sm font-medium">Loading analytics…</span>
                </div>
            ) : null}

            {data ? (
                <>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {kpis.map((stat) => (
                            <article
                                key={stat.label}
                                className="rounded-[18px] border border-[#dce6ea] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(24,52,64,.04)]"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{stat.label}</p>
                                <p
                                    className={`mt-1.5 font-bold leading-none tabular-nums tracking-tight text-slate-900 ${
                                        stat.value.length > 12 ? "text-[22px]" : "text-[28px]"
                                    }`}
                                >
                                    {stat.value}
                                </p>
                                <p className={`mt-2 text-xs leading-snug ${stat.warn ? "font-medium text-rose-600" : "text-slate-500"}`}>
                                    {stat.hint}
                                </p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <article className="rounded-[18px] border border-[#dce6ea] bg-white p-4 shadow-[0_8px_22px_rgba(24,52,64,.04)]">
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

                        <article className="rounded-[18px] border border-[#dce6ea] bg-white p-4 shadow-[0_8px_22px_rgba(24,52,64,.04)]">
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
                                        <Link
                                            href="/dashboard/faculty/attendance-review"
                                            className="font-semibold text-teal-800 hover:underline"
                                        >
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

            <details
                className="mt-4 rounded-[18px] border border-[#dce6ea] bg-white shadow-[0_8px_22px_rgba(24,52,64,.04)]"
                onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span>
                        Advanced · report fields by section
                        <span className="ml-2 text-xs font-medium text-slate-400">{hubSubtitle || "Aggregate cohort"}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${advancedOpen ? "rotate-180" : ""}`} />
                </summary>
                {advancedOpen ? (
                    <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
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
                ) : null}
            </details>
        </div>
    );
}
