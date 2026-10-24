"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatAdminDateTime } from "@/utils/adminDate";
import {
    HUB_ADMIN_BASE,
    HUB_CONNECTION_STATUSES,
    hubRequest,
    type HubConnection,
    type HubDataResponse,
    type HubListResponse,
    type HubPlatform,
} from "@/utils/integrationHub";
import { ConnectionFormDialog, ReasonDialog } from "./HubDialogs";
import { btnPrimary, btnSecondary, btnSmall, HubBadge, inputCls, Pager, TableShell, TD, TH } from "./HubUi";
import { useHubList } from "./useHubList";

export type ConnectionAction = "authorize" | "suspend" | "resume" | "revoke";

/** Shared by the tab and the detail page. Suspend/revoke carry a reason. */
export async function runConnectionAction(id: string, action: ConnectionAction, reason?: string): Promise<HubConnection> {
    const j = await hubRequest<HubDataResponse<HubConnection>>(`${HUB_ADMIN_BASE}/connections/${id}/${action}`, {
        method: "POST",
        body: action === "suspend" || action === "revoke" ? { reason: reason || undefined } : {},
    });
    return j.data;
}

export function ConnectionActionButtons({ connection, onDone, compact }: { connection: HubConnection; onDone: () => void; compact?: boolean }) {
    const [reason, setReason] = useState<"suspend" | "revoke" | null>(null);
    const [busy, setBusy] = useState(false);
    const cls = compact ? btnSmall : btnSecondary;
    /** Runs an action; `rethrow` keeps a reason dialog open on failure so the typed reason survives. */
    const run = async (action: ConnectionAction, why?: string, rethrow = false) => {
        if (busy) return;
        setBusy(true);
        try {
            const c = await runConnectionAction(connection.id, action, why);
            toast.success(`Connection ${c.status}`);
            onDone();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Action failed");
            if (rethrow) throw e;
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className={`flex flex-wrap gap-1 ${compact ? "justify-end" : ""}`}>
            {connection.status === "org_approved" ? (
                <button type="button" className={compact ? btnSmall : btnPrimary} disabled={busy} onClick={() => void run("authorize")}>
                    Authorize
                </button>
            ) : null}
            {connection.status === "proposed" ? <span className="self-center text-xs text-slate-500">Waiting for organization approval</span> : null}
            {connection.status === "active" ? (
                <button type="button" className={cls} disabled={busy} onClick={() => setReason("suspend")}>
                    Suspend
                </button>
            ) : null}
            {connection.status === "suspended" ? (
                <button type="button" className={cls} disabled={busy} onClick={() => void run("resume")}>
                    Resume
                </button>
            ) : null}
            {connection.status !== "revoked" ? (
                <button type="button" className={`${cls} text-red-700`} disabled={busy} onClick={() => setReason("revoke")}>
                    Revoke
                </button>
            ) : null}
            <ReasonDialog
                open={Boolean(reason)}
                title={reason === "revoke" ? "Revoke connection?" : "Suspend connection?"}
                description={
                    reason === "revoke"
                        ? "The vendor can no longer submit for this organization. Existing records stay in the repository under retention rules."
                        : "New submissions are rejected and queued events wait until the connection is resumed."
                }
                confirmLabel={reason === "revoke" ? "Revoke" : "Suspend"}
                variant={reason === "revoke" ? "danger" : "warning"}
                onCancel={() => setReason(null)}
                onConfirm={async (why) => {
                    if (!reason) return;
                    try {
                        await run(reason, why, true);
                        setReason(null);
                    } catch {
                        // Error already toasted; the dialog stays open with the typed reason.
                    }
                }}
            />
        </div>
    );
}

export default function ConnectionsTab({ initialPlatformId }: { initialPlatformId?: string }) {
    const [status, setStatus] = useState("");
    const [platformId, setPlatformId] = useState(initialPlatformId ?? "");
    const filters = useMemo(() => ({ status, platformId }), [status, platformId]);
    const list = useHubList<HubConnection>(`${HUB_ADMIN_BASE}/connections`, filters);
    const [platforms, setPlatforms] = useState<HubPlatform[]>([]);
    const [proposeOpen, setProposeOpen] = useState(false);

    useEffect(() => {
        hubRequest<HubListResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms?limit=100`)
            .then((j) => setPlatforms(j.rows ?? []))
            .catch(() => setPlatforms([]));
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
                <div className="w-44">
                    <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {HUB_CONNECTION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="w-56">
                    <select className={inputCls} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                        <option value="">All platforms</option>
                        {platforms.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="ml-auto flex gap-2">
                    <button type="button" className={btnSecondary} onClick={list.reload} disabled={list.loading}>
                        <RefreshCw className={`h-4 w-4 ${list.loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button type="button" className={btnPrimary} onClick={() => setProposeOpen(true)}>
                        <Plus className="h-4 w-4" /> Propose connection
                    </button>
                </div>
            </div>

            <TableShell
                loading={list.loading}
                error={list.error}
                empty={list.rows.length === 0}
                emptyText="No connections yet. Propose one for an approved organization."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Organization</TH>
                            <TH>Platform</TH>
                            <TH>Status</TH>
                            <TH>Scopes</TH>
                            <TH>Policy</TH>
                            <TH>Updated</TH>
                            <TH className="text-right">Actions</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/60">
                                <TD>
                                    <Link href={`/dashboard/admin/integrations/connections/${c.id}`} className="font-medium text-blue-700 hover:underline">
                                        {c.organizationName}
                                    </Link>
                                    {c.dpaReference ? <div className="text-xs text-slate-400">DPA {c.dpaReference}</div> : null}
                                </TD>
                                <TD>{c.platform?.name ?? c.platformId}</TD>
                                <TD>
                                    <HubBadge status={c.status} />
                                    {c.statusReason ? <div className="mt-1 max-w-[200px] truncate text-[11px] text-slate-500" title={c.statusReason}>{c.statusReason}</div> : null}
                                </TD>
                                <TD>
                                    <span className="text-xs text-slate-600">{c.scopes.length ? c.scopes.join(", ") : "none"}</span>
                                </TD>
                                <TD className="text-xs text-slate-600">
                                    {c.personalFieldsAllowed ? "personal fields" : "no personal data"}
                                    {c.orgEvidenceOpenAllowed ? " · org opens evidence" : ""}
                                    {c.retentionDays ? ` · ${c.retentionDays}d` : ""}
                                </TD>
                                <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(c.updatedAt)}</TD>
                                <TD>
                                    <div className="flex flex-wrap items-center justify-end gap-1">
                                        <ConnectionActionButtons connection={c} onDone={list.reload} compact />
                                        <Link href={`/dashboard/admin/integrations/connections/${c.id}`} className={`${btnSmall} inline-flex items-center gap-1`}>
                                            Detail <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>

            <ConnectionFormDialog open={proposeOpen} platforms={platforms} defaultPlatformId={platformId || undefined} onClose={() => setProposeOpen(false)} onSaved={() => list.reload()} />
        </div>
    );
}
