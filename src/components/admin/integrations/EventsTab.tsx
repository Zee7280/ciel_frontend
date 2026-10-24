"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatAdminDateTime } from "@/utils/adminDate";
import {
    formatBytes,
    HUB_ADMIN_BASE,
    HUB_EVENT_STATUSES,
    HUB_EVENT_TYPES,
    hubRequest,
    shortId,
    type HubDataResponse,
    type HubEvent,
    type HubListResponse,
    type HubPlatform,
} from "@/utils/integrationHub";
import { btnPrimary, btnSecondary, HubBadge, inputCls, isUuid, JsonBlock, KV, Modal, Pager, rowButtonProps, TableShell, TD, TH } from "./HubUi";
import { useHubList, useHubResource } from "./useHubList";

export default function EventsTab({ initialConnectionId }: { initialConnectionId?: string }) {
    const [platformId, setPlatformId] = useState("");
    const [connectionId, setConnectionId] = useState(initialConnectionId ?? "");
    const [status, setStatus] = useState("");
    const [eventType, setEventType] = useState("");
    const [q, setQ] = useState("");
    const [applied, setApplied] = useState({ connectionId: initialConnectionId ?? "", q: "" });
    const filters = useMemo(() => ({ platformId, status, eventType, connectionId: applied.connectionId, q: applied.q }), [platformId, status, eventType, applied]);
    const list = useHubList<HubEvent>(`${HUB_ADMIN_BASE}/events`, filters);
    const [platforms, setPlatforms] = useState<HubPlatform[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);
    const detail = useHubResource<HubEvent>(openId ? `${HUB_ADMIN_BASE}/events/${openId}` : null);
    const [replaying, setReplaying] = useState(false);
    const [filterError, setFilterError] = useState<string | null>(null);

    useEffect(() => {
        hubRequest<HubListResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms?limit=100`)
            .then((j) => setPlatforms(j.rows ?? []))
            .catch(() => setPlatforms([]));
    }, []);

    const replay = async (id: string) => {
        setReplaying(true);
        try {
            const j = await hubRequest<HubDataResponse<{ status: string; errorCode: string | null; errorMessage: string | null }>>(`${HUB_ADMIN_BASE}/events/${id}/replay`, { method: "POST" });
            toast[j.data.status === "processed" ? "success" : "warning"](`Replay result: ${j.data.status}${j.data.errorCode ? ` (${j.data.errorCode})` : ""}`);
            detail.reload();
            list.reload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Replay failed");
        } finally {
            setReplaying(false);
        }
    };

    const applyText = () => {
        const cid = connectionId.trim();
        if (cid && !isUuid(cid)) {
            setFilterError("Connection id must be a UUID (copy it from the connection detail page).");
            return;
        }
        setFilterError(null);
        setApplied({ connectionId: cid, q: q.trim() });
    };

    return (
        <div className="space-y-3">
            <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    applyText();
                }}
            >
                <select className={`${inputCls} w-48`} value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                    <option value="">All platforms</option>
                    {platforms.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <select className={`${inputCls} w-36`} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    {HUB_EVENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select className={`${inputCls} w-44`} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                    <option value="">All event types</option>
                    {HUB_EVENT_TYPES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <input className={`${inputCls} w-72`} placeholder="Connection id (UUID)" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} />
                <input className={`${inputCls} w-48`} placeholder="Vendor event id" value={q} onChange={(e) => setQ(e.target.value)} />
                <button type="submit" className={btnSecondary}>
                    Apply
                </button>
                <button type="button" className={`${btnSecondary} ml-auto`} onClick={list.reload} disabled={list.loading}>
                    <RefreshCw className={`h-4 w-4 ${list.loading ? "animate-spin" : ""}`} /> Refresh
                </button>
                {filterError ? <p className="w-full text-xs text-red-700">{filterError}</p> : null}
            </form>

            <TableShell
                loading={list.loading}
                error={list.error}
                empty={list.rows.length === 0}
                emptyText="No events match these filters."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Received</TH>
                            <TH>Vendor event id</TH>
                            <TH>Type</TH>
                            <TH>Status</TH>
                            <TH>Attempts</TH>
                            <TH>Error</TH>
                            <TH>Size</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((e) => (
                            <tr key={e.id} className="cursor-pointer hover:bg-slate-50/60 focus:outline-none focus-visible:bg-slate-100" {...rowButtonProps(() => setOpenId(e.id))}>
                                <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(e.receivedAt)}</TD>
                                <TD>
                                    <code className="text-xs">{e.sourceEventId}</code>
                                    <div className="text-[11px] text-slate-400">conn {shortId(e.connectionId)}</div>
                                </TD>
                                <TD className="text-xs">{e.eventType}</TD>
                                <TD>
                                    <HubBadge status={e.status} />
                                </TD>
                                <TD className="text-xs">{e.attempts}</TD>
                                <TD className="max-w-[260px] truncate text-xs text-red-700" title={e.errorMessage ?? undefined}>
                                    {e.errorCode ?? ""}
                                </TD>
                                <TD className="text-xs">{formatBytes(e.payloadBytes)}</TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>

            <Modal open={Boolean(openId)} title="Event detail" onClose={() => setOpenId(null)} wide>
                {detail.loading ? (
                    <div className="flex items-center gap-2 py-8 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                    </div>
                ) : detail.error ? (
                    <p className="text-sm text-red-700">{detail.error}</p>
                ) : detail.data ? (
                    <div className="space-y-4">
                        <KV
                            items={[
                                ["Vendor event id", <code key="s">{detail.data.sourceEventId}</code>],
                                ["Status", <HubBadge key="st" status={detail.data.status} />],
                                ["Type", detail.data.eventType],
                                ["Received", formatAdminDateTime(detail.data.receivedAt)],
                                ["Processed", formatAdminDateTime(detail.data.processedAt)],
                                ["Attempts / next", `${detail.data.attempts} · ${formatAdminDateTime(detail.data.nextAttemptAt)}`],
                                ["Connection", <code key="c">{detail.data.connectionId}</code>],
                                ["Key id", detail.data.credentialKeyId ?? "—"],
                            ]}
                        />
                        {detail.data.errorCode || detail.data.errorMessage ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                                <strong>{detail.data.errorCode}</strong> {detail.data.errorMessage}
                            </div>
                        ) : null}
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Envelope (as received)</p>
                            <JsonBlock value={detail.data.envelope} />
                        </div>
                        {detail.data.status === "dead" || detail.data.status === "rejected" || detail.data.status === "deferred" ? (
                            <div className="flex justify-end">
                                <button type="button" className={btnPrimary} disabled={replaying} onClick={() => replay(detail.data!.id)}>
                                    {replaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Replay event
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
