"use client";

import { Lock, Sparkles } from "lucide-react";
import AnalyticsFieldValue, { analyticsFieldSpan } from "@/components/analytics/AnalyticsFieldValue";
import {
    ANALYTICS_CATEGORY_DESCRIPTIONS,
    ANALYTICS_CATEGORY_LABELS,
    ANALYTICS_CATEGORY_ORDER,
    categoryAccentDot,
    categoryBandHeaderClasses,
    categoryCardClasses,
    categoryPillClasses,
    type AnalyticsCategory,
} from "@/components/analytics/analyticsCategoryStyles";
import {
    orderedEntriesForCategory,
    orderedSection1FieldEntries,
    section1FieldLabel,
    type Section1AnalyticsFieldMeta,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";

type AnalyticsMetricsGridProps = {
    payload: Section1AnalyticsPayload;
    categoryFilter?: "all" | "basic" | "premium" | "restricted";
    maxFields?: number;
};

export default function AnalyticsMetricsGrid({
    payload,
    categoryFilter = "all",
    maxFields = 0,
}: AnalyticsMetricsGridProps) {
    if (categoryFilter === "all") {
        const bands = ANALYTICS_CATEGORY_ORDER.map((category) => ({
            category,
            entries: orderedEntriesForCategory(payload, category),
        })).filter((band) => band.entries.length > 0);

        if (bands.length === 0) {
            return <EmptyState message="No metrics match this filter." />;
        }

        return (
            <div className="space-y-4">
                {bands.map(({ category, entries }) => {
                    const visible = maxFields > 0 ? entries.slice(0, maxFields) : entries;
                    return (
                        <section
                            key={category}
                            className="overflow-hidden border border-slate-200 bg-white shadow-sm shadow-slate-100/60"
                        >
                            <BandHeader category={category} count={entries.length} />
                            <MetricCardsGrid
                                entries={visible}
                                payload={payload}
                            />
                        </section>
                    );
                })}
            </div>
        );
    }

    const entries = orderedSection1FieldEntries(payload).filter(
        ([key]) => payload.meta[key]?.category === categoryFilter,
    );
    const visible = maxFields > 0 ? entries.slice(0, maxFields) : entries;

    if (visible.length === 0) {
        return <EmptyState message="No metrics match this filter." />;
    }

    return (
        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm shadow-slate-100/60">
            <BandHeader category={categoryFilter} count={visible.length} />
            <MetricCardsGrid entries={visible} payload={payload} />
        </section>
    );
}

function BandHeader({ category, count }: { category: AnalyticsCategory; count: number }) {
    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5 ${categoryBandHeaderClasses(category)}`}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${categoryAccentDot(category)}`} />
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold tracking-tight text-slate-900">
                            {ANALYTICS_CATEGORY_LABELS[category]}
                        </h3>
                        {category === "premium" ? (
                            <Sparkles className="h-3 w-3 text-amber-600" aria-hidden />
                        ) : null}
                        {category === "restricted" ? (
                            <Lock className="h-3 w-3 text-rose-600" aria-hidden />
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                        {ANALYTICS_CATEGORY_DESCRIPTIONS[category]}
                    </p>
                </div>
            </div>
            <span className="shrink-0 tabular-nums text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {count} field{count === 1 ? "" : "s"}
            </span>
        </div>
    );
}

function MetricCardsGrid({
    entries,
    payload,
}: {
    entries: Array<[string, unknown]>;
    payload: Section1AnalyticsPayload;
}) {
    return (
        <div className="grid grid-cols-1 border-l border-t border-slate-200 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map(([key, value]) => {
                const meta = payload.meta[key];
                const category = meta?.category ?? "basic";
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
                        className={`border-b border-r border-slate-200 p-3.5 ${categoryCardClasses(category)} ${spanClass}`}
                    >
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {section1FieldLabel(key)}
                            </p>
                            <CategoryPill category={category} />
                        </div>
                        <AnalyticsFieldValue fieldKey={key} value={value} meta={meta} />
                        {meta?.presentation ? (
                            <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-400">
                                {meta.presentation}
                            </p>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}

function CategoryPill({ category }: { category?: Section1AnalyticsFieldMeta["category"] }) {
    if (!category) return null;
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${categoryPillClasses(category)}`}
        >
            {category === "restricted" ? <Lock className="h-2.5 w-2.5" aria-hidden /> : null}
            {category === "premium" ? <Sparkles className="h-2.5 w-2.5" aria-hidden /> : null}
            {ANALYTICS_CATEGORY_LABELS[category]}
        </span>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-600">{message}</p>
        </div>
    );
}
