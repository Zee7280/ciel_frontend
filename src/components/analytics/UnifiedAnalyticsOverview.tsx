"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    Clock3,
    FileCheck2,
    FileText,
    FolderKanban,
    Loader2,
    RefreshCw,
    Target,
    Users,
    type LucideIcon,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { authenticatedFetch, resolveSameOriginApiPath } from "@/utils/api";

type Kpi = {
    key: string;
    label: string;
    value: number;
    unit?: "count" | "percent" | "hours";
    description: string;
};

type ChartSeries = {
    key: string;
    title: string;
    type: "bar" | "line" | "donut";
    data: Array<{ label: string; value: number; color?: string }>;
};

type OverviewPayload = {
    generated_at: string;
    kpis: Kpi[];
    charts: ChartSeries[];
};

type UnifiedAnalyticsOverviewProps = {
    apiPath: string;
    query?: Record<string, string | undefined>;
    title?: string;
};

const KPI_ICONS: Record<string, LucideIcon> = {
    total_reports: FileText,
    verified_reports: FileCheck2,
    projects: FolderKanban,
    average_completion: Target,
    reported_hours: Clock3,
    reported_beneficiaries: Users,
};

const CHART_COLORS = ["#0f766e", "#0369a1", "#334155", "#b45309", "#be123c", "#4338ca", "#64748b"];

const tooltipStyle = {
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    boxShadow: "none",
    fontSize: 12,
};

function formatKpi(kpi: Kpi): string {
    const value = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: kpi.unit === "hours" ? 1 : 0,
    }).format(kpi.value);
    if (kpi.unit === "percent") return `${value}%`;
    if (kpi.unit === "hours") return `${value}h`;
    return value;
}

function ChartEmpty() {
    return (
        <div className="flex h-[220px] items-center justify-center border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-500">
            No data in this scope
        </div>
    );
}

export default function UnifiedAnalyticsOverview({
    apiPath,
    query,
    title = "Overall analytics",
}: UnifiedAnalyticsOverviewProps) {
    const [data, setData] = useState<OverviewPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const queryKey = JSON.stringify(query ?? {});

    const requestPath = useMemo(() => {
        const params = new URLSearchParams();
        Object.entries(query ?? {}).forEach(([key, value]) => {
            if (value?.trim()) params.set(key, value.trim());
        });
        const encoded = params.toString();
        return `${resolveSameOriginApiPath(apiPath)}${encoded ? `?${encoded}` : ""}`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiPath, queryKey]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(requestPath, {}, { redirectToLogin: true, timeoutMs: 60_000 });
            if (!response?.ok) {
                setError("Overall analytics could not be loaded.");
                return;
            }
            const body = (await response.json()) as { success?: boolean; data?: OverviewPayload };
            if (!body.success || !body.data) {
                setError("Analytics response was incomplete.");
                return;
            }
            setData(body.data);
        } catch {
            setError("Overall analytics could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [requestPath]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return (
            <section className="flex min-h-40 items-center justify-center border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </section>
        );
    }

    if (error && !data) {
        return (
            <section className="border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                <p className="text-sm text-rose-700">{error}</p>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-3 inline-flex items-center gap-2 border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                </button>
            </section>
        );
    }

    const charts = data?.charts ?? [];
    const primaryCharts = charts.filter((c) => c.key === "section_completion" || c.key === "report_status");
    const secondaryCharts = charts.filter((c) => c.key !== "section_completion" && c.key !== "report_status");

    return (
        <section className="space-y-3" aria-labelledby="overall-analytics-heading">
            <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Executive summary</p>
                    <h2 id="overall-analytics-heading" className="text-lg font-semibold tracking-tight text-slate-900">
                        {title}
                    </h2>
                    {data?.generated_at ? (
                        <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                            Updated {new Date(data.generated_at).toLocaleString()}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 border border-slate-200 bg-white md:grid-cols-3 xl:grid-cols-6">
                {(data?.kpis ?? []).map((kpi, index) => {
                    const Icon = KPI_ICONS[kpi.key] ?? BarChart3;
                    return (
                        <article
                            key={kpi.key}
                            className={`px-3 py-3 ${index % 2 === 1 ? "bg-slate-50/40" : ""} ${
                                index > 0 ? "border-l border-slate-200" : ""
                            }`}
                            title={kpi.description}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                                <Icon className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                                {formatKpi(kpi)}
                            </p>
                        </article>
                    );
                })}
            </div>

            <div className="grid gap-3 xl:grid-cols-5">
                <div className="grid gap-3 xl:col-span-3 xl:grid-cols-2">
                    {primaryCharts.map((chart) => (
                        <ChartPanel key={chart.key} chart={chart} />
                    ))}
                </div>
                <div className="grid gap-3 xl:col-span-2">
                    {secondaryCharts.map((chart) => (
                        <ChartPanel key={chart.key} chart={chart} compact />
                    ))}
                </div>
            </div>
        </section>
    );
}

function ChartPanel({ chart, compact = false }: { chart: ChartSeries; compact?: boolean }) {
    const hasData = chart.data.some((point) => point.value > 0);
    return (
        <article className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <h3 className="text-xs font-semibold text-slate-800">{chart.title}</h3>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{chart.type}</span>
            </div>
            {hasData ? (
                <div className={compact ? "h-[200px] p-2" : "h-[240px] p-2"}>
                    <ResponsiveContainer width="100%" height="100%">
                        {chart.type === "line" ? (
                            <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                                <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} width={28} tick={{ fill: "#64748b" }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Line type="monotone" dataKey="value" name="Reports" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        ) : chart.type === "donut" ? (
                            <PieChart>
                                <Pie data={chart.data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={1}>
                                    {chart.data.map((point, index) => (
                                        <Cell
                                            key={`${point.label}-${index}`}
                                            fill={point.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        ) : (
                            <BarChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                                <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} width={28} tick={{ fill: "#64748b" }} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar
                                    dataKey="value"
                                    name={chart.key === "section_completion" ? "Completion %" : "Count"}
                                    radius={[2, 2, 0, 0]}
                                    fill="#0f766e"
                                >
                                    {chart.data.map((point, index) => (
                                        <Cell
                                            key={`${point.label}-${index}`}
                                            fill={point.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="p-2">
                    <ChartEmpty />
                </div>
            )}
        </article>
    );
}
