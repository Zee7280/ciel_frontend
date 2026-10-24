"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { isAbortError, useAbortableFetch } from "@/components/admin/useAbortableFetch";
import { formatAdminDateTime } from "@/utils/adminDate";
import { formatBytes, formatDuration, HUB_ADMIN_BASE, hubRequest, type HubDataResponse, type HubHealth } from "@/utils/integrationHub";
import { btnPrimary, btnSecondary, HubBadge, SectionCard, TableShell, TD, TH, Tile } from "./HubUi";

export default function OverviewTab() {
    const [health, setHealth] = useState<HubHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sweeping, setSweeping] = useState(false);
    const { begin } = useAbortableFetch();

    const load = useCallback(
        (refresh: boolean) => {
            const run = begin();
            setLoading(true);
            setError(null);
            hubRequest<HubDataResponse<HubHealth>>(`${HUB_ADMIN_BASE}/health${refresh ? "?refresh=1" : ""}`, { signal: run.signal })
                .then((j) => {
                    if (run.isCurrent()) setHealth(j.data);
                })
                .catch((e: unknown) => {
                    if (isAbortError(e) || !run.isCurrent()) return;
                    setError(e instanceof Error ? e.message : "Failed to load health");
                })
                .finally(() => {
                    if (run.isCurrent()) setLoading(false);
                });
        },
        [begin],
    );

    useEffect(() => {
        load(false);
    }, [load]);

    const runSweeper = async () => {
        setSweeping(true);
        try {
            const j = await hubRequest<HubDataResponse<{ claimed: number; processed: number; deferred: number; rejected: number; dead: number; skipped: number }>>(
                `${HUB_ADMIN_BASE}/events/sweep`,
                { method: "POST" },
            );
            const d = j.data;
            toast.success(`Sweeper: claimed ${d.claimed}, processed ${d.processed}, deferred ${d.deferred}, rejected ${d.rejected}, dead ${d.dead}`);
            load(true);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Sweep failed");
        } finally {
            setSweeping(false);
        }
    };

    const cfg = health?.configuration;
    const q = health?.queue;
    const d = health?.last_24h;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                    {health ? (
                        <>
                            Summary generated {formatAdminDateTime(health.generated_at)} {health.cached ? "(cached, refreshed at most every 5 minutes)" : "(fresh)"}
                        </>
                    ) : (
                        "Periodic summary — no live polling."
                    )}
                </p>
                <div className="flex gap-2">
                    <button type="button" className={btnSecondary} onClick={() => load(true)} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button type="button" className={btnPrimary} onClick={runSweeper} disabled={sweeping}>
                        {sweeping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run sweeper now
                    </button>
                </div>
            </div>

            {cfg && (!cfg.secrets_key_configured || !cfg.evidence_storage_configured) ? (
                <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {!cfg.secrets_key_configured ? (
                        <p className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> HUB_SECRETS_KEY is not configured: credentials cannot be issued and vendors cannot authenticate.
                        </p>
                    ) : null}
                    {!cfg.evidence_storage_configured ? (
                        <p className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> Evidence storage (HUB_EVIDENCE_BUCKET) is not configured: upload tickets will be refused.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {loading && !health ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : health ? (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Tile label="Received (24h)" value={d?.received ?? 0} tone="blue" />
                        <Tile label="Processed (24h)" value={d?.processed ?? 0} tone="green" />
                        <Tile label="Rejected / dead (24h)" value={`${d?.rejected ?? 0} / ${d?.dead ?? 0}`} tone={(d?.dead ?? 0) > 0 ? "red" : "slate"} />
                        <Tile label="Pending queue" value={q?.pending ?? 0} sub={`oldest ${formatDuration(q?.oldest_pending_seconds)} · dead ${q?.dead ?? 0}`} tone={(q?.pending ?? 0) > 100 ? "amber" : "slate"} />
                        <Tile label="Platforms" value={health.totals.platforms} />
                        <Tile label="Active connections" value={health.totals.active_connections} />
                        <Tile label="Current records" value={health.totals.current_records} />
                        <Tile label="Evidence" value={health.evidence.accepted_objects} sub={`${formatBytes(health.evidence.accepted_bytes)} accepted · ${health.evidence.quarantined} in quarantine`} />
                    </div>
                    <p className="text-xs text-slate-500">
                        Rate-limit refusals since process start: {health.rate_limit_hits}
                        {cfg?.evidence_bucket ? ` · evidence bucket ${cfg.evidence_bucket}` : ""}
                    </p>
                    <SectionCard title="Per-platform traffic (last 24h)">
                        <TableShell loading={false} error={null} empty={health.platforms.length === 0} emptyText="No platforms registered.">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <TH>Platform</TH>
                                        <TH>Status</TH>
                                        <TH className="text-right">Received</TH>
                                        <TH className="text-right">Failed</TH>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {health.platforms.map((p) => (
                                        <tr key={p.platform_id}>
                                            <TD>
                                                <Link href={`/dashboard/admin/integrations/platforms/${p.platform_id}`} className="font-medium text-blue-700 hover:underline">
                                                    {p.name}
                                                </Link>
                                                <span className="ml-2 text-xs text-slate-400">{p.slug}</span>
                                            </TD>
                                            <TD>
                                                <HubBadge status={p.status} />
                                            </TD>
                                            <TD className="text-right">{p.received_24h}</TD>
                                            <TD className={`text-right ${p.failed_24h > 0 ? "font-semibold text-red-600" : ""}`}>{p.failed_24h}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableShell>
                    </SectionCard>
                </>
            ) : null}
        </div>
    );
}
