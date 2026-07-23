"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Lock, Sparkles } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/app/dashboard/student/report/components/ui/card";
import AnalyticsFieldValue, { analyticsFieldSpan } from "@/components/analytics/AnalyticsFieldValue";
import {
    ANALYTICS_CATEGORY_LABELS,
    ANALYTICS_CATEGORY_ORDER,
    categoryAccentDot,
    categoryBandHeaderClasses,
    categoryCardClasses,
    categoryPillClasses,
} from "@/components/analytics/analyticsCategoryStyles";
import {
    fetchSection1Analytics,
    orderedEntriesForCategory,
    section1FieldLabel,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";

type Section1AnalyticsPanelProps = {
    /** Same-origin BFF path, e.g. `/api/v1/student/projects/.../section1-analytics` */
    apiPath: string;
    query?: Record<string, string | undefined>;
    title?: string;
    description?: string;
    /** Hide entirely when fetch fails (default true — does not break existing pages). */
    hideOnError?: boolean;
    maxFields?: number;
    className?: string;
};

function stakeholderLabel(stakeholder: string): string {
    return stakeholder.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FieldSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 h-2.5 w-24 rounded bg-slate-100" />
            <div className="mb-2 h-8 w-16 rounded bg-slate-100" />
            <div className="h-2 w-full rounded bg-slate-100" />
        </div>
    );
}

export default function Section1AnalyticsPanel({
    apiPath,
    query,
    title = "Participation & attendance",
    description = "Server-side metrics with role-based visibility. Your existing engagement calculations remain unchanged.",
    hideOnError = true,
    maxFields = 12,
    className = "",
}: Section1AnalyticsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Section1AnalyticsPayload | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        void (async () => {
            const payload = await fetchSection1Analytics(apiPath, query);
            if (cancelled) return;
            setData(payload);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [apiPath, JSON.stringify(query ?? {})]);

    const bands = useMemo(() => {
        if (!data) return [];
        let remaining = maxFields > 0 ? maxFields : Number.POSITIVE_INFINITY;
        const result: Array<{
            category: (typeof ANALYTICS_CATEGORY_ORDER)[number];
            entries: Array<[string, unknown]>;
        }> = [];
        for (const category of ANALYTICS_CATEGORY_ORDER) {
            if (remaining <= 0) break;
            const all = orderedEntriesForCategory(data, category);
            if (all.length === 0) continue;
            const slice = all.slice(0, remaining);
            remaining -= slice.length;
            result.push({ category, entries: slice });
        }
        return result;
    }, [data, maxFields]);

    if (loading) {
        return (
            <div
                className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 shadow-sm ${className}`}
            >
                <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-slate-900">{title}</p>
                            <p className="text-sm text-slate-500">Loading analytics…</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <FieldSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (!data || bands.length === 0) {
        return hideOnError ? null : (
            <Card className={className}>
                <CardContent className="p-6 text-sm text-slate-500">Analytics unavailable.</CardContent>
            </Card>
        );
    }

    return (
        <Card
            className={`overflow-hidden border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-md shadow-slate-200/40 ${className}`}
        >
            <CardHeader className="border-b border-slate-100 bg-white/80 pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
                            <CardDescription className="mt-1 max-w-2xl text-sm leading-relaxed">
                                {description}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                            {data.scope === "aggregate" ? "Aggregate" : "Project scope"}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                            {stakeholderLabel(data.stakeholder)}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {bands.map(({ category, entries }) => (
                    <section key={category} className="overflow-hidden border border-slate-200 bg-white">
                        <div
                            className={`flex items-center gap-2 border-b px-3 py-2 ${categoryBandHeaderClasses(category)}`}
                        >
                            <span className={`h-2 w-2 rounded-full ${categoryAccentDot(category)}`} />
                            <p className="text-xs font-semibold text-slate-800">
                                {ANALYTICS_CATEGORY_LABELS[category]}
                            </p>
                            {category === "premium" ? (
                                <Sparkles className="h-3 w-3 text-amber-600" aria-hidden />
                            ) : null}
                            {category === "restricted" ? (
                                <Lock className="h-3 w-3 text-rose-600" aria-hidden />
                            ) : null}
                            <span className="ml-auto text-[10px] font-semibold tabular-nums text-slate-500">
                                {entries.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                            {entries.map(([key, value]) => {
                                const meta = data.meta[key];
                                const span = analyticsFieldSpan(key, value);
                                const spanClass =
                                    span === "full"
                                        ? "sm:col-span-2 xl:col-span-3"
                                        : span === "wide"
                                          ? "sm:col-span-2"
                                          : "";

                                return (
                                    <article
                                        key={key}
                                        className={`rounded-xl border border-slate-100 p-4 shadow-sm ${categoryCardClasses(meta?.category)} ${spanClass}`}
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                                {section1FieldLabel(key)}
                                            </p>
                                            {meta?.category ? (
                                                <span
                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${categoryPillClasses(meta.category)}`}
                                                >
                                                    {ANALYTICS_CATEGORY_LABELS[meta.category]}
                                                </span>
                                            ) : null}
                                        </div>
                                        <AnalyticsFieldValue fieldKey={key} value={value} meta={meta} />
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </CardContent>
        </Card>
    );
}
