"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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

export default function AnalyticsMatrixTable({ payload, categoryFilter = "all" }: AnalyticsMatrixTableProps) {
    const [search, setSearch] = useState("");

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orderedSection1FieldEntries(payload).filter(([key]) => {
            if (categoryFilter !== "all" && payload.meta[key]?.category !== categoryFilter) return false;
            if (!q) return true;
            const label = section1FieldLabel(key).toLowerCase();
            const presentation = (payload.meta[key]?.presentation ?? "").toLowerCase();
            return label.includes(q) || key.includes(q) || presentation.includes(q);
        });
    }, [payload, categoryFilter, search]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Analytics matrix</h3>
                    <p className="text-xs text-slate-500">{rows.length} fields</p>
                </div>
                <label className="relative block w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fields…"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                            return (
                                <tr key={key} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 font-medium text-slate-800">{section1FieldLabel(key)}</td>
                                    <td className="max-w-xs px-4 py-3 text-slate-600">{formatSection1FieldValue(value)}</td>
                                    <td className="max-w-sm px-4 py-3 text-xs text-slate-500">{meta?.presentation ?? "—"}</td>
                                    <td className="px-4 py-3 capitalize text-slate-600">{meta?.category ?? "—"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
