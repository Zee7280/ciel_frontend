"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    BarChart3,
    Grid3X3,
    LayoutGrid,
    Loader2,
    Lock,
    RefreshCw,
    Table2,
} from "lucide-react";
import AnalyticsMatrixTable from "@/components/analytics/AnalyticsMatrixTable";
import AnalyticsMetricsGrid from "@/components/analytics/AnalyticsMetricsGrid";
import {
    categoryCounts,
    extractProjectContext,
    extractSectionKpis,
    type AnalyticsKpiCard,
} from "@/components/analytics/analyticsKpiExtract";
import {
    ANALYTICS_CATEGORY_LABELS,
    categoryTabActiveClasses,
    type AnalyticsCategory,
} from "@/components/analytics/analyticsCategoryStyles";
import {
    getAnalyticsSection,
    REPORT_ANALYTICS_SECTIONS,
    resolveSectionAnalyticsApiPath,
    resolveSummaryApiPath,
    type ReportAnalyticsSectionId,
} from "@/components/analytics/analyticsSections";
import {
    fetchSection1Analytics,
    orderedSection1FieldEntries,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

export type AnalyticsHubView = {
    id: string;
    label: string;
    apiPath: string;
    query?: Record<string, string | undefined>;
    description?: string;
};

type AnalyticsHubProps = {
    views: AnalyticsHubView[];
    defaultViewId?: string;
    projectTitleOverride?: string;
    reportLink?: string;
    hideOnError?: boolean;
    className?: string;
};

type ViewMode = "cards" | "matrix";
type DensityMode = "basic" | "progress";
type CategoryFilter = "all" | "basic" | "premium" | "restricted";

const STAKEHOLDER_LABELS: Record<string, string> = {
    ciel: "CIEL.PK",
    student: "Student",
    partner: "Partner",
    university: "University",
    un_government: "UN / Govt",
};

function kpiToneClass(tone: AnalyticsKpiCard["tone"]): string {
    switch (tone) {
        case "success":
            return "border-l-teal-600 bg-white";
        case "warning":
            return "border-l-amber-500 bg-white";
        case "danger":
            return "border-l-rose-500 bg-white";
        default:
            return "border-l-slate-300 bg-white";
    }
}

export default function AnalyticsHub({
    views,
    defaultViewId,
    projectTitleOverride,
    reportLink,
    hideOnError = false,
    className = "",
}: AnalyticsHubProps) {
    const [activeViewId, setActiveViewId] = useState(defaultViewId ?? views[0]?.id ?? "default");
    const [activeSection, setActiveSection] = useState<ReportAnalyticsSectionId>(1);
    const [viewMode, setViewMode] = useState<ViewMode>("cards");
    const [densityMode, setDensityMode] = useState<DensityMode>("progress");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Section1AnalyticsPayload | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        sections: Array<{
            section: number;
            title: string;
            status: string;
            headline: string;
            completion_percent: number;
        }>;
        composite?: {
            sections_with_data: number;
            average_completion_percent: number;
            verified_reports: number;
            total_reports: number;
        };
    } | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
    const queryKey = JSON.stringify(activeView?.query ?? {});
    const sectionApiPath = activeView
        ? resolveSectionAnalyticsApiPath(activeView.apiPath, activeSection)
        : "";
    const summaryApiPath = activeView ? resolveSummaryApiPath(activeView.apiPath) : null;

    useEffect(() => {
        if (!activeView || !sectionApiPath) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        void (async () => {
            const payload = await fetchSection1Analytics(sectionApiPath, activeView.query);
            if (cancelled) return;
            if (payload) {
                setData(payload);
                setLoadError(null);
            } else {
                setData((prev) => (prev ? { ...prev, fields: {}, meta: {} } : prev));
                setLoadError("Could not load this section’s analytics. Try refresh or another section.");
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [sectionApiPath, queryKey, refreshKey, activeSection, activeView]);


    useEffect(() => {
        if (!summaryApiPath) {
            setSummary(null);
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const params = new URLSearchParams();
                if (activeView?.query) {
                    for (const [k, v] of Object.entries(activeView.query)) {
                        const s = (v ?? "").trim();
                        if (s) params.set(k, s);
                    }
                }
                const qs = params.toString();
                const url = resolveSameOriginApiPath(qs ? `${summaryApiPath}?${qs}` : summaryApiPath);
                const res = await authenticatedFetch(url, {}, { redirectToLogin: false, timeoutMs: 45_000 });
                if (!res?.ok || cancelled) return;
                const json = await res.json().catch(() => null);
                if (cancelled || !json?.success || !json?.data) return;
                setSummary(json.data);
            } catch {
                if (!cancelled) setSummary(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [summaryApiPath, queryKey, refreshKey, activeViewId]);

    const sectionDef = getAnalyticsSection(activeSection);
    const isSectionLive = sectionDef?.status === "live" && activeSection <= 10;

    const context = useMemo(() => (data ? extractProjectContext(data) : null), [data]);
    const kpis = useMemo(
        () => (data ? extractSectionKpis(data, activeSection) : []),
        [data, activeSection],
    );
    const counts = useMemo(() => (data ? categoryCounts(data) : { basic: 0, premium: 0, restricted: 0 }), [data]);

    const effectiveCategoryFilter: CategoryFilter =
        densityMode === "basic" && categoryFilter === "all" ? "basic" : categoryFilter;

    const visibleFieldCount = useMemo(() => {
        if (!data || !isSectionLive) return 0;
        return orderedSection1FieldEntries(data).filter(([key]) => {
            if (effectiveCategoryFilter === "all") return true;
            return data.meta[key]?.category === effectiveCategoryFilter;
        }).length;
    }, [data, effectiveCategoryFilter, isSectionLive]);

    const distributionPreview = useMemo(() => {
        if (!data) return [];
        const keys = [
            "degree_program_distribution",
            "academic_integration_type_distribution",
            "year_of_study_distribution",
            "discipline_distribution",
            "primary_sdg_distribution",
            "activity_type_distribution",
            "outcome_area_distribution",
            "resource_type_mix",
            "source_mix",
            "partner_type_mix",
            "sdg17_classification_spread",
            "evidence_type_coverage",
            "competency_group_means",
            "continuation_status_mix",
            "academic_integration_distribution",
        ] as const;
        for (const key of keys) {
            const val = data.fields[key];
            if (Array.isArray(val) && val.length > 0) {
                return val.slice(0, 6) as Array<{ label?: string; count?: number }>;
            }
        }
        return [];
    }, [data]);

    if (!activeView) return null;

    if (loading && !data) {
        return (
            <div className={`flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white ${className}`}>
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium">Loading analytics hub…</p>
                </div>
            </div>
        );
    }

    if (!loading && !data) {
        return hideOnError ? null : (
            <div className={`rounded-3xl border border-slate-200 bg-white p-10 text-center ${className}`}>
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                    {loadError || "Analytics unavailable for this view."}
                </p>
                <button
                    type="button"
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                </button>
            </div>
        );
    }

    const displayTitle = projectTitleOverride || context?.title || "Analytics";
    const stakeholderLabel = data
        ? STAKEHOLDER_LABELS[data.stakeholder] ?? data.stakeholder.replace(/_/g, " ")
        : "—";

    return (
        <div className={`space-y-3 ${className}`}>
            {loadError && data ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="inline-flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {loadError}
                    </span>
                    <button
                        type="button"
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="inline-flex items-center gap-1.5 border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Retry
                    </button>
                </div>
            ) : null}

            {/* BI toolbar */}
            <section className="border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Section workspace</p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">{displayTitle}</h2>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-600">
                                §{activeSection} {sectionDef?.shortLabel ?? sectionDef?.title}
                            </span>
                            <span className="text-[11px] text-slate-400">({stakeholderLabel})</span>
                        </div>
                        {context?.subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{context.subtitle}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {views.map((view) => (
                            <button
                                key={view.id}
                                type="button"
                                onClick={() => setActiveViewId(view.id)}
                                className={`border px-2.5 py-1 text-[11px] font-semibold ${
                                    activeViewId === view.id
                                        ? "border-slate-900 bg-slate-900 text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                                title={view.description}
                            >
                                {view.label}
                            </button>
                        ))}
                        {reportLink ? (
                            <Link
                                href={reportLink}
                                className="border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Open report
                            </Link>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-4">
                    <div className="border-r border-slate-100 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Visible fields</p>
                        <p className="text-lg font-semibold tabular-nums text-slate-900">{visibleFieldCount}</p>
                    </div>
                    <div className="border-r border-slate-100 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Basic</p>
                        <p className="text-lg font-semibold tabular-nums text-slate-700">{counts.basic}</p>
                    </div>
                    <div className="border-r border-slate-100 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Premium</p>
                        <p className="text-lg font-semibold tabular-nums text-amber-700">{counts.premium}</p>
                    </div>
                    <div className="px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Restricted</p>
                        <p className="inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums text-rose-700">
                            {counts.restricted}
                            {counts.restricted > 0 ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}
                        </p>
                        {summary?.composite ? (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                                Avg completion {summary.composite.average_completion_percent}%
                            </p>
                        ) : null}
                    </div>
                </div>

                {/* Compact section switcher */}
                <div className="overflow-x-auto">
                    <div className="flex min-w-max border-b border-slate-100">
                        {REPORT_ANALYTICS_SECTIONS.filter((s) => s.id <= 10).map((section) => {
                            const live = section.status === "live";
                            const selected = activeSection === section.id;
                            const summaryRow = summary?.sections?.find((s) => s.section === section.id);
                            const pct = summaryRow?.completion_percent ?? 0;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    disabled={!live}
                                    onClick={() => live && setActiveSection(section.id)}
                                    className={`relative min-w-[88px] border-r border-slate-100 px-2.5 py-2 text-left transition-colors ${
                                        selected
                                            ? "bg-slate-900 text-white"
                                            : live
                                              ? "bg-white text-slate-800 hover:bg-slate-50"
                                              : "cursor-not-allowed bg-slate-50 text-slate-400"
                                    }`}
                                >
                                    <p className={`text-[9px] font-semibold uppercase tracking-wide ${selected ? "text-slate-300" : "text-slate-400"}`}>
                                        §{section.id}
                                    </p>
                                    <p className="text-xs font-semibold">{section.shortLabel}</p>
                                    <p className={`mt-0.5 text-[10px] tabular-nums ${selected ? "text-slate-300" : "text-slate-500"}`}>
                                        {live ? `${pct}%` : "Soon"}
                                    </p>
                                    {live && !selected ? (
                                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100">
                                            <span className="block h-full bg-teal-600" style={{ width: `${Math.min(100, pct)}%` }} />
                                        </span>
                                    ) : null}
                                    {live && selected ? (
                                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-400" />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {kpis.length > 0 ? (
                <section className="grid grid-cols-2 border border-slate-200 md:grid-cols-3 xl:grid-cols-6">
                    {kpis.map((kpi) => (
                        <article key={kpi.id} className={`border-l-2 px-3 py-2.5 border-t border-slate-200 ${kpiToneClass(kpi.tone)}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                            <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{kpi.value}</p>
                            {kpi.hint ? <p className="mt-0.5 text-[10px] text-slate-500">{kpi.hint}</p> : null}
                        </article>
                    ))}
                </section>
            ) : null}

            {isSectionLive && data ? (
                <>
                    <section className="flex flex-col gap-2 border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Category
                            </span>
                            {(
                                [
                                    { id: "all" as const, label: "All", count: counts.basic + counts.premium + counts.restricted },
                                    { id: "basic" as const, label: ANALYTICS_CATEGORY_LABELS.basic, count: counts.basic },
                                    { id: "premium" as const, label: ANALYTICS_CATEGORY_LABELS.premium, count: counts.premium },
                                    { id: "restricted" as const, label: ANALYTICS_CATEGORY_LABELS.restricted, count: counts.restricted },
                                ] as const
                            )
                                .filter((tab) => tab.id === "all" || tab.count > 0 || categoryFilter === tab.id)
                                .map((tab) => {
                                    const active = effectiveCategoryFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setCategoryFilter(tab.id)}
                                            className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                                active
                                                    ? categoryTabActiveClasses(tab.id as AnalyticsCategory | "all")
                                                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            {tab.id === "restricted" ? <Lock className="h-3 w-3" aria-hidden /> : null}
                                            {tab.label}
                                            <span
                                                className={`tabular-nums ${
                                                    active ? "text-white/80" : "text-slate-400"
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:inline-block" />
                            <ModeToggle label="Basic" active={densityMode === "basic"} onClick={() => setDensityMode("basic")} />
                            <ModeToggle label="Progress" active={densityMode === "progress"} onClick={() => setDensityMode("progress")} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <ViewToggle icon={LayoutGrid} label="Cards" active={viewMode === "cards"} onClick={() => setViewMode("cards")} />
                            <ViewToggle icon={Table2} label="Matrix" active={viewMode === "matrix"} onClick={() => setViewMode("matrix")} />
                            <button
                                type="button"
                                onClick={() => setRefreshKey((k) => k + 1)}
                                className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>
                    </section>

                    <div className="grid gap-3 xl:grid-cols-4">
                        {distributionPreview.length > 0 ? (
                            <section className="border border-slate-200 bg-white xl:col-span-1">
                                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                                    <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                                    <h3 className="text-xs font-semibold text-slate-800">Distribution</h3>
                                </div>
                                <div className="space-y-2.5 p-3">
                                    {distributionPreview.map((row, i) => {
                                        const max = Math.max(...distributionPreview.map((r) => r.count ?? 0), 1);
                                        const width = ((row.count ?? 0) / max) * 100;
                                        return (
                                            <div key={`${row.label}-${i}`}>
                                                <div className="mb-0.5 flex justify-between text-[11px]">
                                                    <span className="truncate pr-2 text-slate-600">{row.label ?? "—"}</span>
                                                    <span className="tabular-nums font-semibold text-slate-900">{row.count ?? 0}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100">
                                                    <div className="h-full bg-teal-700" style={{ width: `${width}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        <div className={distributionPreview.length > 0 ? "xl:col-span-3" : "xl:col-span-4"}>
                            {viewMode === "cards" ? (
                                <AnalyticsMetricsGrid payload={data} categoryFilter={effectiveCategoryFilter} />
                            ) : (
                                <div className="border border-slate-200 bg-white">
                                    <AnalyticsMatrixTable payload={data} categoryFilter={effectiveCategoryFilter} />
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <section className="border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <Grid3X3 className="mx-auto h-8 w-8 text-slate-300" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-800">
                        {data
                            ? `No fields returned for Section ${activeSection}`
                            : `Section ${activeSection} analytics unavailable`}
                    </h3>
                    <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{sectionDef?.description}</p>
                    <button
                        type="button"
                        onClick={() => setActiveSection(1)}
                        className="mt-4 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                        Back to Section 1
                    </button>
                </section>
            )}
        </div>
    );
}

function ModeToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`border px-2 py-1 text-[11px] font-semibold ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
            {label}
        </button>
    );
}

function ViewToggle({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: typeof LayoutGrid;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}
