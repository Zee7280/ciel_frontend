"use client";

import AnalyticsFieldValue, { analyticsFieldSpan } from "@/components/analytics/AnalyticsFieldValue";
import {
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
    const entries = orderedSection1FieldEntries(payload).filter(([key]) => {
        if (categoryFilter === "all") return true;
        return payload.meta[key]?.category === categoryFilter;
    });
    const visible = maxFields > 0 ? entries.slice(0, maxFields) : entries;

    if (visible.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <p className="text-sm font-medium text-slate-600">No metrics match this filter.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(([key, value]) => {
                const span = analyticsFieldSpan(key, value);
                const spanClass = span === "full" ? "sm:col-span-2 xl:col-span-3" : span === "wide" ? "sm:col-span-2" : "";
                return (
                    <article
                        key={key}
                        className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md ${spanClass}`}
                    >
                        <div className="mb-3 flex items-start justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                {section1FieldLabel(key)}
                            </p>
                            <CategoryPill category={payload.meta[key]?.category} />
                        </div>
                        <AnalyticsFieldValue fieldKey={key} value={value} meta={payload.meta[key]} />
                    </article>
                );
            })}
        </div>
    );
}

function CategoryPill({ category }: { category?: Section1AnalyticsFieldMeta["category"] }) {
    if (!category) return null;
    const styles =
        category === "basic"
            ? "bg-sky-50 text-sky-700"
            : category === "premium"
              ? "bg-violet-50 text-violet-700"
              : "bg-rose-50 text-rose-700";
    return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styles}`}>{category}</span>;
}
