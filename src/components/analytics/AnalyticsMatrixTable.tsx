"use client";

import { useMemo, useState } from "react";
import { Lock, Search, Sparkles } from "lucide-react";
import {
    ANALYTICS_CATEGORY_LABELS,
    categoryPillClasses,
} from "@/components/analytics/analyticsCategoryStyles";
import {
    formatSection1FieldValue,
    orderedSection1FieldEntries,
    section1FieldLabel,
    type Section1AnalyticsPayload,
} from "@/utils/section1Analytics";

type AnalyticsMatrixTableProps = {
    payload: Section1AnalyticsPayload;
    categoryFilter?: "all" | "basic" | "premium" | "restricted";
};

export default function AnalyticsMatrixTable({
    payload,
    categoryFilter = "all",
}: AnalyticsMatrixTableProps) {
    const [search, setSearch] = useState("");

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orderedSection1FieldEntries(payload).filter(([key]) => {
            if (categoryFilter !== "all" && payload.meta[key]?.category !== categoryFilter) {
                return false;
            }
            if (!q) return true;
            const label = section1FieldLabel(key).toLowerCase();
            const presentation = (payload.meta[key]?.presentation ?? "").toLowerCase();
            return label.includes(q) || key.includes(q) || presentation.includes(q);
        });
    }, [payload, categoryFilter, search]);

    return (
        <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Analytics matrix</h3>
                    <p className="text-xs text-slate-500">{rows.length} fields</p>
                </div>
                <label className="relative block w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fields…"
                        className="w-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                    />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Field</th>
                            <th className="px-4 py-3">Output</th>
                            <th className="px-4 py-3">Presentation</th>
                            <th className="px-4 py-3">Category</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map(([key, value]) => {
                            const meta = payload.meta[key];
                            const category = meta?.category;
                            return (
                                <tr key={key} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {section1FieldLabel(key)}
                                    </td>
                                    <td className="max-w-xs px-4 py-3 text-slate-600">
                                        {formatSection1FieldValue(value)}
                                    </td>
                                    <td className="max-w-sm px-4 py-3 text-xs text-slate-500">
                                        {meta?.presentation ?? "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {category ? (
                                            <span
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${categoryPillClasses(category)}`}
                                            >
                                                {category === "restricted" ? (
                                                    <Lock className="h-2.5 w-2.5" aria-hidden />
                                                ) : null}
                                                {category === "premium" ? (
                                                    <Sparkles className="h-2.5 w-2.5" aria-hidden />
                                                ) : null}
                                                {ANALYTICS_CATEGORY_LABELS[category]}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
