"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    ArrowLeft,
    BookOpen,
    Eye,
    Filter,
    Loader2,
    RefreshCw,
    RotateCcw,
} from "lucide-react";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";
import {
    extractSectionKpis,
    type AnalyticsKpiCard,
} from "@/components/analytics/analyticsKpiExtract";
import {
    formatSection1FieldValue,
    section1FieldLabel,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";
import { analyticsSectionUiMark, REPORT_ANALYTICS_SECTIONS } from "@/components/analytics/analyticsSections";

type ConsoleRole = "student" | "faculty" | "university" | "partner" | "unhec";

type RegistryRole = {
    id: ConsoleRole;
    label: string;
    chip: string;
    color: string;
};

type RegistryField = {
    key: string;
    presentation: string;
    category: string;
    mapped_roles: ConsoleRole[];
};

type RegistrySection = {
    section: number;
    name: string;
    short_label: string;
    field_count: number;
    fields: RegistryField[];
};

type RegistryPayload = {
    primary_owner: string;
    editable: boolean;
    note: string;
    roles: RegistryRole[];
    sections: RegistrySection[];
    view_count: number;
};

type ViewAsPayload = {
    console_role: ConsoleRole;
    role_label: string;
    role_color: string;
    mapped_stakeholder: string;
    section: number;
    section_title: string;
    primary_owner: string;
    note: string;
    filters?: {
        scope: string;
        university: string | null;
        project_id: string | null;
        active: boolean;
    };
    analytics: Section1AnalyticsPayload;
    underlying_fields: Array<{
        key: string;
        presentation: string;
        category: string;
    }>;
};

const ROLE_ORDER: ConsoleRole[] = [
    "student",
    "faculty",
    "university",
    "partner",
    "unhec",
];

const ROLE_EMOJI: Record<ConsoleRole, string> = {
    student: "🎓",
    faculty: "🧑‍🏫",
    university: "🏛",
    partner: "🤝",
    unhec: "🌐",
};

const CHART_COLORS = [
    "#4f46e5",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#a78bfa",
    "#9aa1b1",
];

function isDistArray(
    v: unknown,
): v is Array<{ label?: string; count?: number }> {
    return (
        Array.isArray(v) &&
        v.length > 0 &&
        typeof v[0] === "object" &&
        v[0] != null &&
        ("label" in v[0] || "count" in v[0])
    );
}

function pickChartFromFields(
    fields: Record<string, unknown>,
): { title: string; kind: "bar" | "pie"; rows: { name: string; value: number }[] } | null {
    const preferred = [
        "activity_type_distribution",
        "discipline_distribution",
        "primary_sdg_distribution",
        "beneficiary_category_distribution",
        "outcome_area_distribution",
        "resource_type_mix",
        "partner_type_mix",
        "evidence_type_coverage",
        "competency_group_means",
        "continuation_status_mix",
        "validation_status_mix",
        "confidence_level_mix",
        "source_mix",
        "media_visibility_mix",
        "academic_integration_distribution",
        "mechanisms_distribution",
    ];
    for (const key of preferred) {
        const v = fields[key];
        if (!isDistArray(v)) continue;
        const rows = v
            .map((r) => ({
                name: String(r.label ?? "?"),
                value: typeof r.count === "number" ? r.count : 0,
            }))
            .filter((r) => r.value > 0)
            .slice(0, 8);
        if (rows.length === 0) continue;
        return {
            title: section1FieldLabel(key),
            kind: rows.length <= 5 ? "pie" : "bar",
            rows,
        };
    }
    for (const [key, v] of Object.entries(fields)) {
        if (!isDistArray(v)) continue;
        const rows = v
            .map((r) => ({
                name: String(r.label ?? "?"),
                value: typeof r.count === "number" ? r.count : 0,
            }))
            .filter((r) => r.value > 0)
            .slice(0, 8);
        if (rows.length === 0) continue;
        return {
            title: section1FieldLabel(key),
            kind: rows.length <= 5 ? "pie" : "bar",
            rows,
        };
    }
    return null;
}

type AllFieldsConsolePanelProps = {
    /** When embedded in CIEL Master, parent owns the dark chrome / hero. */
    embedded?: boolean;
    /** Controlled mode from parent (e.g. CIEL Master tabs). */
    mode?: "view" | "reg";
    onModeChange?: (mode: "view" | "reg") => void;
    /** Show internal View/Registry tab strip (false when parent owns tabs). */
    showModeTabs?: boolean;
    title?: string;
    subtitle?: string;
};

export function AllFieldsConsolePanel({
    embedded = false,
    mode: controlledMode,
    onModeChange,
    showModeTabs = true,
    title = "All-Fields Analytics Console",
    subtitle = "Every KPI and field across form tabs 1–9 (activities/outcomes as 4A/4B) is owned by Super Admin. Stakeholders see mapped copies.",
}: AllFieldsConsolePanelProps) {
    const [internalMode, setInternalMode] = useState<"view" | "reg">("view");
    const mode = controlledMode ?? internalMode;
    const setMode = (m: "view" | "reg") => {
        onModeChange?.(m);
        if (controlledMode === undefined) setInternalMode(m);
    };
    const [role, setRole] = useState<ConsoleRole>("student");
    const [section, setSection] = useState(1);
    const [universityFilter, setUniversityFilter] = useState("");
    const [projectIdFilter, setProjectIdFilter] = useState("");
    const [appliedUniversity, setAppliedUniversity] = useState("");
    const [appliedProjectId, setAppliedProjectId] = useState("");
    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
    const [registry, setRegistry] = useState<RegistryPayload | null>(null);
    const [viewAs, setViewAs] = useState<ViewAsPayload | null>(null);
    const [loadingReg, setLoadingReg] = useState(true);
    const [loadingView, setLoadingView] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRegistry = useCallback(async () => {
        setLoadingReg(true);
        try {
            const url = resolveSameOriginApiPath(
                "/api/v1/admin/analytics/all-fields-console/registry",
            );
            const res = await authenticatedFetch(url, {}, { redirectToLogin: false, timeoutMs: 45_000 });
            const json = (await res?.json().catch(() => null)) as
                | { success?: boolean; data?: RegistryPayload; message?: string }
                | null;
            if (!res?.ok || !json?.success || !json.data) {
                setError(json?.message || "Failed to load field registry");
                setRegistry(null);
                return;
            }
            setRegistry(json.data);
            setError(null);
        } catch {
            setError("Failed to load field registry");
            setRegistry(null);
        } finally {
            setLoadingReg(false);
        }
    }, []);

    const loadViewAs = useCallback(async () => {
        setLoadingView(true);
        try {
            const qs = new URLSearchParams({
                role,
                section: String(section),
            });
            if (appliedProjectId.trim()) {
                qs.set("project_id", appliedProjectId.trim());
                qs.set("scope", "project");
            } else {
                qs.set("scope", "aggregate");
            }
            if (appliedUniversity.trim()) {
                qs.set("university", appliedUniversity.trim());
            }
            const url = resolveSameOriginApiPath(
                `/api/v1/admin/analytics/all-fields-console/view-as?${qs}`,
            );
            const res = await authenticatedFetch(url, {}, { redirectToLogin: false, timeoutMs: 60_000 });
            const json = (await res?.json().catch(() => null)) as
                | { success?: boolean; data?: ViewAsPayload; message?: string }
                | null;
            if (!res?.ok || !json?.success || !json.data) {
                setError(json?.message || "Failed to load view-as mirror");
                setViewAs(null);
                return;
            }
            setViewAs(json.data);
            setError(null);
        } catch {
            setError("Failed to load view-as mirror");
            setViewAs(null);
        } finally {
            setLoadingView(false);
        }
    }, [role, section, appliedUniversity, appliedProjectId]);

    useEffect(() => {
        void loadRegistry();
    }, [loadRegistry]);

    useEffect(() => {
        if (mode === "view") void loadViewAs();
    }, [mode, loadViewAs]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const prRes = await authenticatedFetch(
                    resolveSameOriginApiPath("/api/v1/admin/projects"),
                    {},
                    { timeoutMs: 60_000 },
                );
                if (cancelled || !prRes?.ok) return;
                const body = await prRes.json().catch(() => ({}));
                const raw = Array.isArray(body?.data)
                    ? body.data
                    : Array.isArray(body)
                      ? body
                      : [];
                const projectsOut: { id: string; title: string }[] = [];
                for (const row of raw as Record<string, unknown>[]) {
                    const id = String(row.id ?? "").trim();
                    const title = String(row.title ?? row.name ?? "Untitled").trim();
                    if (id) projectsOut.push({ id, title });
                }
                setProjects(projectsOut.sort((a, b) => a.title.localeCompare(b.title)));
            } catch {
                /* optional */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const roleMeta = useMemo(() => {
        const fromReg = registry?.roles.find((r) => r.id === role);
        return (
            fromReg ?? {
                id: role,
                label: role,
                chip: role.slice(0, 1).toUpperCase(),
                color: "#4f46e5",
            }
        );
    }, [registry, role]);

    const kpis = useMemo(() => {
        if (!viewAs?.analytics) return [] as AnalyticsKpiCard[];
        return extractSectionKpis(viewAs.analytics, section).slice(0, 4);
    }, [viewAs, section]);

    const chart = useMemo(() => {
        if (!viewAs?.analytics?.fields) return null;
        return pickChartFromFields(viewAs.analytics.fields);
    }, [viewAs]);

    const sections = REPORT_ANALYTICS_SECTIONS.filter((s) => s.id <= 10);

    const viewTitle = viewAs
        ? `${viewAs.role_label} — §${analyticsSectionUiMark(viewAs.section)} ${viewAs.section_title}`
        : null;

    return (
        <div className={embedded ? "space-y-4" : "mx-auto max-w-[1220px] space-y-4 pb-12"}>
            {!embedded ? (
                <>
                    <div className="-mx-4 mb-2 bg-[#0f1222] px-4 py-3.5 text-white sm:-mx-3 sm:px-3 md:-mx-5 md:rounded-none md:px-5 lg:mx-0 lg:rounded-2xl lg:px-6">
                        <div className="mx-auto flex max-w-[1220px] flex-wrap items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold">
                                C
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-[15px] font-bold leading-tight">{title}</h1>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Every field · every stakeholder · primary owner: super admin
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Super Admin · Root
                            </span>
                        </div>
                    </div>

                    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <Link
                                href="/dashboard/admin/analytics"
                                className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-700"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Analytics
                            </Link>
                            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Signed in · CIEL PK Platform Administration
                            </p>
                            <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900">
                                All Analytics Live Here First
                            </h2>
                            <p className="mt-1 max-w-2xl text-[12.5px] text-slate-500">{subtitle}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-[#fdf6e3] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#b8860b]">
                                ★ {registry?.view_count ?? 50} stakeholder views · 1 owner
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    void loadRegistry();
                                    if (mode === "view") void loadViewAs();
                                }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Refresh
                            </button>
                        </div>
                    </header>
                </>
            ) : null}

            {showModeTabs ? (
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button
                    type="button"
                    onClick={() => setMode("view")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                        mode === "view"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <Eye className="h-3.5 w-3.5" /> View as stakeholder
                </button>
                <button
                    type="button"
                    onClick={() => setMode("reg")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
                        mode === "reg"
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                    <BookOpen className="h-3.5 w-3.5" /> Field ownership registry
                </button>
            </div>
            ) : null}

            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            ) : null}

            {mode === "view" ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {ROLE_ORDER.map((r) => {
                            const meta = registry?.roles.find((x) => x.id === r);
                            const on = role === r;
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px] font-extrabold uppercase tracking-wide ${
                                        on
                                            ? "border-transparent text-white"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                    style={on ? { background: meta?.color ?? roleMeta.color } : undefined}
                                >
                                    <span className="text-sm">{ROLE_EMOJI[r]}</span>
                                    {meta?.label ?? r}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSection(s.id)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                                    section === s.id
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                S{analyticsSectionUiMark(s.id)} · {s.shortLabel}
                            </button>
                        ))}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                                    Analytics filters
                                </p>
                                {viewAs?.filters?.active ? (
                                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                        Active
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        Platform-wide
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAppliedUniversity(universityFilter.trim());
                                        setAppliedProjectId(projectIdFilter.trim());
                                    }}
                                    className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white hover:bg-indigo-700"
                                >
                                    Apply filters
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUniversityFilter("");
                                        setProjectIdFilter("");
                                        setAppliedUniversity("");
                                        setAppliedProjectId("");
                                    }}
                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-[11px] font-semibold text-slate-600">
                                University
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Exact / partial name (e.g. BNU)"
                                    value={universityFilter}
                                    onChange={(e) => setUniversityFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            setAppliedUniversity(universityFilter.trim());
                                            setAppliedProjectId(projectIdFilter.trim());
                                        }
                                    }}
                                />
                            </label>
                            <label className="block text-[11px] font-semibold text-slate-600">
                                Project
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={projectIdFilter}
                                    onChange={(e) => setProjectIdFilter(e.target.value)}
                                >
                                    <option value="">All projects (aggregate)</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <p className="mt-2 text-[10.5px] text-slate-400">
                            Filters apply to live View-as KPIs/charts for the selected role × section.
                            Leave empty for full platform aggregate.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-[13px] border border-[#f0e0b8] bg-gradient-to-r from-[#fdf6e3] to-[#fef3e2] px-4 py-3 text-xs text-slate-700">
                        <span className="text-base">👑</span>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">
                                Primary owner: SUPER ADMIN.
                            </p>
                            <p className="text-slate-600">
                                This is the exact analytics view mapped to the selected role — rendered from
                                the master field registry, not from the role&apos;s account.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                            <span className="rounded-lg bg-slate-900 px-2 py-1 text-white">
                                Super Admin
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
                                {roleMeta.label}
                            </span>
                            <span className="font-medium normal-case tracking-normal text-slate-500">
                                · mapping editable in registry
                            </span>
                        </div>
                    </div>

                    {loadingView ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : viewAs ? (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                                        {viewTitle}
                                    </h2>
                                    <p className="mt-0.5 text-[12.5px] text-slate-500">
                                        {viewAs.section_title} — exactly what the {viewAs.role_label} role
                                        sees, rendered from the master registry.
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                    {viewAs.role_label} view · read-only mirror
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                                {kpis.map((k) => (
                                    <div
                                        key={k.id}
                                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-[17px] py-[15px]"
                                    >
                                        <div
                                            className="absolute left-0 top-0 h-[3px] w-full"
                                            style={{ background: viewAs.role_color || "#4f46e5" }}
                                        />
                                        <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                            {k.label}
                                        </p>
                                        <p className="mt-1 text-[23px] font-extrabold tracking-tight text-slate-900">
                                            {k.value}
                                        </p>
                                        {k.hint ? (
                                            <p className="mt-0.5 text-[11px] text-slate-500">{k.hint}</p>
                                        ) : null}
                                    </div>
                                ))}
                                {kpis.length === 0 ? (
                                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                        No KPI cards for this lens yet — fields still listed below.
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
                                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-[18px]">
                                    <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">
                                        {chart?.title ?? "Chart"}
                                    </h3>
                                    <p className="mb-3.5 text-[11px] text-slate-400">
                                        From live platform aggregate fields
                                    </p>
                                    {chart ? (
                                        <div className="h-[230px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {chart.kind === "pie" ? (
                                                    <PieChart>
                                                        <Pie
                                                            data={chart.rows}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            innerRadius={55}
                                                            outerRadius={85}
                                                            paddingAngle={2}
                                                        >
                                                            {chart.rows.map((_, i) => (
                                                                <Cell
                                                                    key={i}
                                                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                ) : (
                                                    <BarChart data={chart.rows}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                                                        <YAxis tick={{ fontSize: 10 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                                                            {chart.rows.map((_, i) => (
                                                                <Cell
                                                                    key={i}
                                                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="flex h-[230px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                                            No distribution field in this lens
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-[18px]">
                                    <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">
                                        Underlying fields — owned by Super Admin
                                    </h3>
                                    <p className="mb-3.5 text-[11px] text-slate-400">
                                        Source fields this view computes from · 👑 = primary ownership
                                    </p>
                                    <div className="flex max-h-[260px] flex-wrap gap-1.5 overflow-y-auto">
                                        {(viewAs.underlying_fields ?? []).map((f) => (
                                            <span
                                                key={f.key}
                                                className="inline-flex items-center gap-1.5 rounded-[9px] border border-slate-200 bg-[#fbfbfe] px-[11px] py-1.5 text-[11px] font-semibold text-slate-700"
                                                title={formatSection1FieldValue(
                                                    viewAs.analytics.fields[f.key],
                                                )}
                                            >
                                                <span className="font-extrabold text-[#b8860b]">👑</span>
                                                {f.presentation || section1FieldLabel(f.key)}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-3 border-t border-dashed border-slate-200 pt-2.5 text-[10.5px] text-slate-400">
                                        Mapping note: {viewAs.note}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
                            No view data
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">
                        Field Ownership Registry — form tabs 1–9 (4A/4B)
                    </h3>
                    <p className="mb-4 text-[11px] text-slate-400">
                        {registry?.note ??
                            "Every field’s primary owner is Super Admin. Role chips show mapped read access."}
                    </p>
                    {loadingReg ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[9.5px] uppercase tracking-[0.1em] text-slate-400">
                                        <th className="w-36 px-2.5 py-2 font-bold">Section</th>
                                        <th className="px-2.5 py-2 font-bold">
                                            Fields (primary: Super Admin 👑)
                                        </th>
                                        <th className="w-52 px-2.5 py-2 font-bold">Mapped read access</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(registry?.sections ?? []).map((s) => {
                                        const rolesOnSection = new Set<ConsoleRole>();
                                        for (const f of s.fields) {
                                            for (const r of f.mapped_roles) rolesOnSection.add(r);
                                        }
                                        return (
                                            <tr key={s.section} className="border-b border-slate-100 align-top">
                                                <td className="px-2.5 py-2.5">
                                                    <p className="font-bold text-slate-900">
                                                        {s.short_label} · {s.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {s.field_count} fields
                                                    </p>
                                                </td>
                                                <td className="px-2.5 py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {s.fields.map((f) => (
                                                            <span
                                                                key={f.key}
                                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-[#fbfbfe] px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                                                title={`${f.category} · ${f.key}`}
                                                            >
                                                                <span className="font-extrabold text-[#b8860b]">👑</span>
                                                                {f.presentation || f.key}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-2.5 py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ROLE_ORDER.filter((r) => rolesOnSection.has(r)).map(
                                                            (r) => {
                                                                const meta = registry?.roles.find(
                                                                    (x) => x.id === r,
                                                                );
                                                                return (
                                                                    <span
                                                                        key={r}
                                                                        title={meta?.label ?? r}
                                                                        className="mr-1 inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-[9.5px] font-extrabold text-white"
                                                                        style={{
                                                                            background:
                                                                                meta?.color ?? "#64748b",
                                                                        }}
                                                                    >
                                                                        {meta?.chip ?? r[0].toUpperCase()}
                                                                    </span>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className="mt-3 border-t border-dashed border-slate-200 pt-2.5 text-[10.5px] text-slate-400">
                                Legend:{" "}
                                {(registry?.roles ?? []).map((r) => (
                                    <span key={r.id} className="mr-2 inline-flex items-center gap-1">
                                        <span
                                            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-[9.5px] font-extrabold text-white"
                                            style={{ background: r.color }}
                                        >
                                            {r.chip}
                                        </span>
                                        {r.label}
                                    </span>
                                ))}
                                — a role sees a field only through its mapped, filtered view. Registry is
                                read-only.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AllFieldsConsolePanel;
