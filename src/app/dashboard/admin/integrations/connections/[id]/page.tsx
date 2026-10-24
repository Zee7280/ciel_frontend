"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Pencil, RefreshCw } from "lucide-react";
import { formatAdminDateTime } from "@/utils/adminDate";
import { HUB_ADMIN_BASE, type HubConnection, type HubSummary } from "@/utils/integrationHub";
import { ConnectionFormDialog } from "@/components/admin/integrations/HubDialogs";
import { ConnectionActionButtons } from "@/components/admin/integrations/ConnectionsTab";
import { btnSecondary, HubBadge, KV, SectionCard, TableShell, TD, TH } from "@/components/admin/integrations/HubUi";
import { useHubResource } from "@/components/admin/integrations/useHubList";
import { useRouter } from "next/navigation";

type ConnectionDetail = { connection: HubConnection; summaries: HubSummary[] };

function SummaryTable({ rows }: { rows: HubSummary[] }) {
    return (
        <TableShell loading={false} error={null} empty={rows.length === 0} emptyText="No records processed yet.">
            <table className="min-w-full">
                <thead className="bg-slate-50">
                    <tr>
                        <TH>Scope</TH>
                        <TH>Period</TH>
                        <TH className="text-right">Records</TH>
                        <TH>Metric totals</TH>
                        <TH>Updated</TH>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((s) => (
                        <tr key={s.id}>
                            <TD>
                                <code className="text-xs">{s.scopeKey}</code>
                            </TD>
                            <TD className="text-xs">{s.period}</TD>
                            <TD className="text-right">{s.recordCount}</TD>
                            <TD className="text-xs">
                                {Object.entries(s.metricTotals).length === 0
                                    ? "—"
                                    : Object.entries(s.metricTotals)
                                          .map(([k, v]) => `${k} ${v}`)
                                          .join(" · ")}
                            </TD>
                            <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(s.updatedAt)}</TD>
                        </tr>
                    ))}
                </tbody>
            </table>
        </TableShell>
    );
}

export { SummaryTable };

export default function ConnectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const detail = useHubResource<ConnectionDetail>(`${HUB_ADMIN_BASE}/connections/${id}`);
    const [editOpen, setEditOpen] = useState(false);
    const c = detail.data?.connection;

    return (
        <div className="space-y-5">
            <Link href="/dashboard/admin/integrations?tab=connections" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" /> Connections
            </Link>

            {detail.loading && !c ? (
                <div className="flex items-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : detail.error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detail.error}</div>
            ) : c ? (
                <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                                {c.organizationName} <HubBadge status={c.status} />
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                via{" "}
                                <Link href={`/dashboard/admin/integrations/platforms/${c.platformId}`} className="text-blue-700 hover:underline">
                                    {c.platform?.name ?? c.platformId}
                                </Link>{" "}
                                · proposed {formatAdminDateTime(c.createdAt)}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={btnSecondary} onClick={detail.reload} disabled={detail.loading}>
                                <RefreshCw className={`h-4 w-4 ${detail.loading ? "animate-spin" : ""}`} /> Refresh
                            </button>
                            {c.status !== "revoked" ? (
                                <button type="button" className={btnSecondary} onClick={() => setEditOpen(true)}>
                                    <Pencil className="h-4 w-4" /> Edit
                                </button>
                            ) : null}
                            <ConnectionActionButtons
                                connection={c}
                                onDone={detail.reload}
                                onDeleted={() => router.push("/dashboard/admin/integrations?tab=connections")}
                            />
                        </div>
                    </div>

                    {c.statusReason ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> {c.status}: {c.statusReason}
                        </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <SectionCard title="Authorization">
                            <KV
                                items={[
                                    ["Purpose", c.purpose ?? "—"],
                                    ["Scopes", c.scopes.length ? c.scopes.join(", ") : "none"],
                                    ["DPA reference", c.dpaReference ?? "—"],
                                    ["Organization approved", formatAdminDateTime(c.orgApprovedAt)],
                                    ["CIEL authorized", formatAdminDateTime(c.authorizedAt)],
                                    ["Valid", `${c.validFrom ? formatAdminDateTime(c.validFrom) : "—"} → ${c.validUntil ? formatAdminDateTime(c.validUntil) : "no expiry"}`],
                                ]}
                            />
                        </SectionCard>
                        <SectionCard title="Data policy">
                            <KV
                                items={[
                                    ["Organization id", <code key="o">{c.organizationId}</code>],
                                    ["Connection id (vendors use this)", <code key="c">{c.id}</code>],
                                    ["Personal fields", c.personalFieldsAllowed ? "allowed with per-record attestation" : "rejected at intake"],
                                    ["Org may open evidence", c.orgEvidenceOpenAllowed ? "yes" : "metadata only"],
                                    ["Retention", c.retentionDays ? `${c.retentionDays} days (override)` : "platform default"],
                                    ["Referral domain", c.referralDomain ?? "—"],
                                ]}
                            />
                        </SectionCard>
                    </div>

                    <SectionCard
                        title="Summaries"
                        action={
                            <div className="flex gap-2">
                                <Link href={`/dashboard/admin/integrations?tab=records&connectionId=${c.id}`} className={btnSecondary}>
                                    Records
                                </Link>
                                <Link href={`/dashboard/admin/integrations?tab=events&connectionId=${c.id}`} className={btnSecondary}>
                                    Events
                                </Link>
                                <Link href={`/dashboard/admin/integrations?tab=evidence&connectionId=${c.id}`} className={btnSecondary}>
                                    Evidence
                                </Link>
                            </div>
                        }
                    >
                        <SummaryTable rows={detail.data?.summaries ?? []} />
                    </SectionCard>

                    <ConnectionFormDialog
                        open={editOpen}
                        connection={c}
                        platforms={c.platform ? [{ ...c.platform, approvedEventTypes: c.platform.approvedEventTypes ?? [] }] : []}
                        onClose={() => setEditOpen(false)}
                        onSaved={() => detail.reload()}
                    />
                </>
            ) : null}
        </div>
    );
}
