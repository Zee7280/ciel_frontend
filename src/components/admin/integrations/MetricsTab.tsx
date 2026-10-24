"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { isAbortError, useAbortableFetch } from "@/components/admin/useAbortableFetch";
import { HUB_ADMIN_BASE, hubRequest, type HubDataResponse, type HubMetric } from "@/utils/integrationHub";
import { MetricFormDialog } from "./HubDialogs";
import { btnPrimary, btnSecondary, btnSmall, HubBadge, TableShell, TD, TH } from "./HubUi";

export default function MetricsTab() {
    const [rows, setRows] = useState<HubMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [edit, setEdit] = useState<HubMetric | null | "new">(null);
    const { begin } = useAbortableFetch();

    const load = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        hubRequest<HubDataResponse<HubMetric[]>>(`${HUB_ADMIN_BASE}/metrics`, { signal: run.signal })
            .then((j) => {
                if (run.isCurrent()) setRows(Array.isArray(j.data) ? j.data : []);
            })
            .catch((e: unknown) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Failed to load metrics");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Vendors may only submit metrics defined here. Nothing in this catalog feeds CII, rankings or reports.</p>
                <div className="flex gap-2">
                    <button type="button" className={btnSecondary} onClick={load} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button type="button" className={btnPrimary} onClick={() => setEdit("new")}>
                        <Plus className="h-4 w-4" /> Add metric
                    </button>
                </div>
            </div>
            <TableShell loading={loading} error={error} empty={rows.length === 0} emptyText="No metric definitions yet.">
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Code</TH>
                            <TH>Name</TH>
                            <TH>Unit · type</TH>
                            <TH>Aggregation</TH>
                            <TH>Range</TH>
                            <TH>SDGs</TH>
                            <TH>Active</TH>
                            <TH className="text-right">Actions</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/60">
                                <TD>
                                    <code className="text-xs">{m.code}</code>
                                </TD>
                                <TD>{m.name}</TD>
                                <TD className="text-xs">
                                    {m.unit} · {m.dataType}
                                </TD>
                                <TD className="text-xs">
                                    {m.aggregation} · {m.defaultClassification}
                                </TD>
                                <TD className="text-xs">
                                    {m.minValue ?? "−∞"} … {m.maxValue ?? "∞"}
                                </TD>
                                <TD className="text-xs">{m.sdgs.length ? m.sdgs.join(", ") : "—"}</TD>
                                <TD>
                                    <HubBadge status={m.active ? "active" : "retired"} />
                                </TD>
                                <TD className="text-right">
                                    <button type="button" className={`${btnSmall} inline-flex items-center gap-1`} onClick={() => setEdit(m)}>
                                        <Pencil className="h-3 w-3" /> Edit
                                    </button>
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
            <MetricFormDialog open={edit !== null} metric={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={load} />
        </div>
    );
}
