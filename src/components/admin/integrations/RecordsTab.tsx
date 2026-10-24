"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatAdminDate, formatAdminDateTime } from "@/utils/adminDate";
import {
    formatBytes,
    HUB_ADMIN_BASE,
    HUB_ORG_BASE,
    HUB_RECORD_STATUSES,
    HUB_REVIEW_STATES,
    hubRequest,
    shortId,
    type HubDataResponse,
    type HubRecord,
    type HubRecordDetail,
} from "@/utils/integrationHub";
import { btnPrimary, btnSecondary, btnSmall, HubBadge, inputCls, isUuid, JsonBlock, KV, Modal, openInNewTab, Pager, rowButtonProps, TableShell, TD, TH } from "./HubUi";
import { useHubList, useHubResource } from "./useHubList";

/** Must be called from a click handler: the tab is opened synchronously, then pointed at the signed URL. */
export async function openEvidence(base: string, evidenceId: string) {
    try {
        await openInNewTab(async () => {
            const j = await hubRequest<HubDataResponse<{ url: string }>>(`${base}/evidence/${evidenceId}/view-url`);
            return j.data.url;
        });
    } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open evidence");
    }
}

/** Record detail modal; `mode` decides which API base to use and whether review actions show. */
export function RecordDetailModal({ recordId, mode, onClose, onChanged }: { recordId: string | null; mode: "admin" | "org"; onClose: () => void; onChanged?: () => void }) {
    const base = mode === "admin" ? HUB_ADMIN_BASE : HUB_ORG_BASE;
    const detail = useHubResource<HubRecordDetail>(recordId ? `${base}/records/${recordId}` : null);
    const [reviewState, setReviewState] = useState<string>("reviewed");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    // The modal stays mounted; a different record must not inherit the previous review draft.
    useEffect(() => {
        setReviewState("reviewed");
        setNote("");
    }, [recordId]);

    const submitReview = async () => {
        if (!recordId) return;
        setSaving(true);
        try {
            await hubRequest<HubDataResponse<HubRecord>>(`${HUB_ADMIN_BASE}/records/${recordId}/review`, { method: "POST", body: { reviewState, note: note.trim() || undefined } });
            toast.success("Review state saved");
            setNote("");
            detail.reload();
            onChanged?.();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Review failed");
        } finally {
            setSaving(false);
        }
    };

    const r = detail.data?.record;
    return (
        <Modal open={Boolean(recordId)} title={r ? `${r.title ?? r.externalActivityId} · v${r.version}` : "Record"} onClose={onClose} wide>
            {detail.loading ? (
                <div className="flex items-center gap-2 py-8 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : detail.error ? (
                <p className="text-sm text-red-700">{detail.error}</p>
            ) : detail.data && r ? (
                <div className="space-y-5">
                    <KV
                        items={[
                            ["External activity id", <code key="a">{r.externalActivityId}</code>],
                            ["Activity type", r.activityType],
                            ["Occurred on", formatAdminDate(r.occurredOn)],
                            ["Status", <HubBadge key="s" status={r.status} />],
                            ["Review", <HubBadge key="rv" status={r.reviewState} />],
                            ["Review note", r.reviewNote ?? "—"],
                            ["Connection", <code key="c">{r.connectionId}</code>],
                            ["Updated", formatAdminDateTime(r.updatedAt)],
                        ]}
                    />
                    <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Metrics</p>
                        {r.metrics.length === 0 ? (
                            <p className="text-sm text-slate-500">No metrics on this version.</p>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <TH>Code</TH>
                                        <TH className="text-right">Value</TH>
                                        <TH>Unit</TH>
                                        <TH>Classification</TH>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {r.metrics.map((m) => (
                                        <tr key={m.code}>
                                            <TD>
                                                <code className="text-xs">{m.code}</code>
                                            </TD>
                                            <TD className="text-right font-semibold">{m.value}</TD>
                                            <TD className="text-xs">{m.unit ?? ""}</TD>
                                            <TD className="text-xs">{m.classification ?? ""}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Payload</p>
                        <JsonBlock value={r.payload} />
                    </div>
                    {r.attestation ? (
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Attestation</p>
                            <JsonBlock value={r.attestation} />
                        </div>
                    ) : null}
                    <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Evidence (metadata)</p>
                        {detail.data.evidence.length === 0 ? (
                            <p className="text-sm text-slate-500">No evidence linked.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {detail.data.evidence.map((ev) => (
                                    <li key={ev.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{ev.originalName ?? ev.uploadId}</p>
                                            <p className="text-xs text-slate-500">
                                                {ev.mimeType} · {formatBytes(ev.sizeBytes)} · <HubBadge status={ev.state} /> · {ev.visibility}
                                                {ev.sha256 ? ` · sha256 ${ev.sha256.slice(0, 12)}…` : ""}
                                            </p>
                                        </div>
                                        {ev.state === "accepted" ? (
                                            <button type="button" className={`${btnSmall} inline-flex items-center gap-1`} onClick={() => openEvidence(base, ev.id)}>
                                                Open <ExternalLink className="h-3 w-3" />
                                            </button>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Versions</p>
                        <ul className="text-sm">
                            {detail.data.versions.map((v) => (
                                <li key={v.id} className="flex items-center gap-2 py-1">
                                    <span className="w-10 font-semibold">v{v.version}</span>
                                    <HubBadge status={v.status} />
                                    <HubBadge status={v.reviewState} />
                                    <span className="text-xs text-slate-500">{formatAdminDateTime(v.createdAt)}</span>
                                </li>
                            ))}
                        </ul>
                        {detail.data.sourceEvent ? (
                            <p className="mt-1 text-xs text-slate-500">
                                Source event <code>{detail.data.sourceEvent.sourceEventId}</code> ({detail.data.sourceEvent.eventType}) received {formatAdminDateTime(detail.data.sourceEvent.receivedAt)}
                            </p>
                        ) : null}
                    </div>
                    {mode === "admin" ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Review (repository only — no effect on academic records)</p>
                            <div className="flex flex-wrap gap-2">
                                <select className={`${inputCls} w-56`} value={reviewState} onChange={(e) => setReviewState(e.target.value)}>
                                    {HUB_REVIEW_STATES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                                <input className={`${inputCls} flex-1`} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                                <button type="button" className={btnPrimary} disabled={saving} onClick={submitReview}>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save review
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </Modal>
    );
}

export function RecordsTable({ base, filtersExtra, mode }: { base: string; filtersExtra?: Record<string, string | undefined>; mode: "admin" | "org" }) {
    const [status, setStatus] = useState("current");
    const [reviewState, setReviewState] = useState("");
    const [connectionId, setConnectionId] = useState(filtersExtra?.connectionId ?? "");
    const [activityType, setActivityType] = useState("");
    const [q, setQ] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [applied, setApplied] = useState({ connectionId: filtersExtra?.connectionId ?? "", activityType: "", q: "", from: "", to: "" });
    const [filterError, setFilterError] = useState<string | null>(null);
    const filters = useMemo(() => ({ status, reviewState, ...applied }), [status, reviewState, applied]);
    const list = useHubList<HubRecord>(`${base}/records`, filters);
    const [openId, setOpenId] = useState<string | null>(null);

    return (
        <div className="space-y-3">
            <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    const cid = connectionId.trim();
                    if (cid && !isUuid(cid)) {
                        setFilterError("Connection id must be a UUID (copy it from the connection detail page).");
                        return;
                    }
                    setFilterError(null);
                    setApplied({ connectionId: cid, activityType: activityType.trim(), q: q.trim(), from, to });
                }}
            >
                <select className={`${inputCls} w-36`} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {HUB_RECORD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <select className={`${inputCls} w-48`} value={reviewState} onChange={(e) => setReviewState(e.target.value)}>
                    <option value="">Any review state</option>
                    {HUB_REVIEW_STATES.map((s) => (
                        <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                        </option>
                    ))}
                </select>
                <input className={`${inputCls} w-72`} placeholder="Connection id (UUID)" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} />
                <input className={`${inputCls} w-36`} placeholder="Activity type" value={activityType} onChange={(e) => setActivityType(e.target.value)} />
                <input className={`${inputCls} w-44`} placeholder="Activity id or title" value={q} onChange={(e) => setQ(e.target.value)} />
                <input type="date" className={`${inputCls} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
                <input type="date" className={`${inputCls} w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
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
                emptyText="No external records match these filters."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Occurred</TH>
                            <TH>Activity</TH>
                            <TH>Type</TH>
                            <TH>Metrics</TH>
                            <TH>Version</TH>
                            <TH>Status</TH>
                            <TH>Review</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((r) => (
                            <tr key={r.id} className="cursor-pointer hover:bg-slate-50/60 focus:outline-none focus-visible:bg-slate-100" {...rowButtonProps(() => setOpenId(r.id))}>
                                <TD className="whitespace-nowrap text-xs">{formatAdminDate(r.occurredOn)}</TD>
                                <TD>
                                    <p className="font-medium">{r.title ?? r.externalActivityId}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {r.externalActivityId} · conn {shortId(r.connectionId)}
                                    </p>
                                </TD>
                                <TD className="text-xs">{r.activityType}</TD>
                                <TD className="text-xs">
                                    {r.metrics
                                        .slice(0, 3)
                                        .map((m) => `${m.code} ${m.value}${m.unit ? ` ${m.unit}` : ""}`)
                                        .join(" · ")}
                                    {r.metrics.length > 3 ? ` +${r.metrics.length - 3}` : ""}
                                </TD>
                                <TD className="text-xs">v{r.version}</TD>
                                <TD>
                                    <HubBadge status={r.status} />
                                </TD>
                                <TD>
                                    <HubBadge status={r.reviewState} />
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>

            <RecordDetailModal recordId={openId} mode={mode} onClose={() => setOpenId(null)} onChanged={list.reload} />
        </div>
    );
}

export default function RecordsTab({ initialConnectionId }: { initialConnectionId?: string }) {
    return <RecordsTable base={HUB_ADMIN_BASE} mode="admin" filtersExtra={{ connectionId: initialConnectionId }} />;
}
