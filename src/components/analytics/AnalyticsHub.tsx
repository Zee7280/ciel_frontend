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
    extractSection1Kpis,
    type AnalyticsKpiCard,
} from "@/components/analytics/analyticsKpiExtract";
import {
    getAnalyticsSection,
    REPORT_ANALYTICS_SECTIONS,
    type ReportAnalyticsSectionId,
} from "@/components/analytics/analyticsSections";
import {
    fetchSection1Analytics,
    orderedSection1FieldEntries,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";

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
            return "border-emerald-100 bg-emerald-50/60";
        case "warning":
            return "border-amber-100 bg-amber-50/60";
        case "danger":
            return "border-rose-100 bg-rose-50/60";
        default:
            return "border-slate-100 bg-white";
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
    const [refreshKey, setRefreshKey] = useState(0);

    const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
    const queryKey = JSON.stringify(activeView?.query ?? {});

    useEffect(() => {
        if (!activeView) return;
        let cancelled = false;
        setLoading(true);
        void (async () => {
            const payload = await fetchSection1Analytics(activeView.apiPath, activeView.query);
            if (cancelled) return;
            setData(payload);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [activeView?.apiPath, queryKey, refreshKey]);

    const sectionDef = getAnalyticsSection(activeSection);
    const isSectionLive = sectionDef?.status === "live" && activeSection === 1;

    const context = useMemo(() => (data ? extractProjectContext(data) : null), [data]);
    const kpis = useMemo(() => (data ? extractSection1Kpis(data) : []), [data]);
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
        ] as const;
        for (const key of keys) {
            const val = data.fields[key];
            if (Array.isArray(val) && val.length > 0) {
                return val.slice(0, 4) as Array<{ label?: string; count?: number }>;
            }
        }
        return [];
    }, [data]);

    if (!activeView) return null;

    if (loading) {
        return (
            <div className={`flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white ${className}`}>
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium">Loading analytics hub…</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return hideOnError ? null : (
            <div className={`rounded-3xl border border-slate-200 bg-white p-10 text-center ${className}`}>
                <p className="text-sm text-slate-600">Analytics unavailable for this view.</p>
            </div>
        );
    }

    const displayTitle = projectTitleOverride || context?.title || "Analytics";
    const stakeholderLabel = STAKEHOLDER_LABELS[data.stakeholder] ?? data.stakeholder.replace(/_/g, " ");

    return (
        <div className={`space-y-6 ${className}`}>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Project context</p>
                            <h2 className="mt-1 truncate text-xl font-bold text-slate-900">{displayTitle}</h2>
                            <p className="mt-1 text-sm text-slate-500">{context?.subtitle}</p>
                            {reportLink ? (
                                <Link href={reportLink} className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:underline">
                                    Open full report →
                                </Link>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ModeToggle label="Basic view" active={densityMode === "basic"} onClick={() => setDensityMode("basic")} />
                            <ModeToggle label="Progress mode" active={densityMode === "progress"} onClick={() => setDensityMode("progress")} />
                            {context?.progressMode ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Progress mode active</span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1fr_auto]">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Selected section</p>
                        <p className="mt-1 text-base font-bold text-slate-900">
                            Section {activeSection} — {sectionDef?.title ?? "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{sectionDef?.description}</p>
                    </div>
                    <div className="flex flex-col justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-center lg:min-w-[180px]">
                        <p className="text-3xl font-black tabular-nums text-indigo-700">{visibleFieldCount}</p>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600/80">Visible fields</p>
                    </div>
                </div>
            </section>

            {kpis.length > 0 ? (
                <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {kpis.map((kpi) => (
                        <article key={kpi.id} className={`rounded-2xl border p-4 shadow-sm ${kpiToneClass(kpi.tone)}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{kpi.value}</p>
                            {kpi.hint ? <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p> : null}
                        </article>
                    ))}
                </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-900">Stakeholder visibility</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Viewing as <strong>{stakeholderLabel}</strong>. Switch cohort lens when multiple views are available.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {views.map((view) => (
                            <button
                                key={view.id}
                                type="button"
                                onClick={() => setActiveViewId(view.id)}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                                    activeViewId === view.id
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {view.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">Basic {counts.basic}</span>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">Premium {counts.premium}</span>
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">Restricted {counts.restricted}</span>
                    </div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-rose-900">Privacy guardrails</p>
                            <p className="mt-1 text-xs leading-relaxed text-rose-800/80">
                                CNIC, raw mobile numbers, and OTP logs stay CIEL-admin only. Partner and UN/Government views
                                never receive PII.
                            </p>
                            {counts.restricted === 0 ? (
                                <p className="mt-2 text-xs font-semibold text-emerald-700">No restricted fields in your view.</p>
                            ) : (
                                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {counts.restricted} restricted fields hidden from your role.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Section library</h3>
                <p className="mt-1 text-xs text-slate-500">Sections 2–11 will activate here as backend APIs ship.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                    {REPORT_ANALYTICS_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const selected = activeSection === section.id;
                        const live = section.status === "live";
                        return (
                            <button
                                key={section.id}
                                type="button"
                                disabled={!live}
                                onClick={() => live && setActiveSection(section.id)}
                                className={`rounded-2xl border p-4 text-left transition-all ${
                                    selected
                                        ? "border-indigo-300 bg-indigo-50 shadow-md shadow-indigo-100"
                                        : live
                                          ? "border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-white"
                                          : "cursor-not-allowed border-slate-100 bg-slate-50/30 opacity-60"
                                }`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                            selected ? "bg-indigo-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">§{section.id}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900">{section.shortLabel}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{section.description}</p>
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">
                                    {live ? <span className="text-emerald-600">Live</span> : <span className="text-slate-400">Soon</span>}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {isSectionLive ? (
                <>
                    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {(["all", "basic", "premium", "restricted"] as const).map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                                        effectiveCategoryFilter === cat
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <ViewToggle icon={LayoutGrid} label="Cards" active={viewMode === "cards"} onClick={() => setViewMode("cards")} />
                            <ViewToggle icon={Table2} label="Matrix" active={viewMode === "matrix"} onClick={() => setViewMode("matrix")} />
                            <button
                                type="button"
                                onClick={() => setRefreshKey((k) => k + 1)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </button>
                        </div>
                    </section>

                    {distributionPreview.length > 0 ? (
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900">Distribution snapshot</h3>
                            </div>
                            <div className="space-y-3">
                                {distributionPreview.map((row, i) => {
                                    const max = Math.max(...distributionPreview.map((r) => r.count ?? 0), 1);
                                    const width = ((row.count ?? 0) / max) * 100;
                                    return (
                                        <div key={`${row.label}-${i}`}>
                                            <div className="mb-1 flex justify-between text-xs">
                                                <span className="font-medium text-slate-700">{row.label ?? "—"}</span>
                                                <span className="font-bold tabular-nums text-slate-900">{row.count ?? 0}</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {viewMode === "cards" ? (
                        <AnalyticsMetricsGrid payload={data} categoryFilter={effectiveCategoryFilter} />
                    ) : (
                        <AnalyticsMatrixTable payload={data} categoryFilter={effectiveCategoryFilter} />
                    )}
                </>
            ) : (
                <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                    <Grid3X3 className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-4 text-lg font-bold text-slate-800">Section {activeSection} analytics coming soon</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{sectionDef?.description}</p>
                    <button
                        type="button"
                        onClick={() => setActiveSection(1)}
                        className="mt-6 rounded-full bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700"
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
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                active ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}
