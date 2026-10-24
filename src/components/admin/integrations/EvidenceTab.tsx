"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { formatAdminDateTime } from "@/utils/adminDate";
import { formatBytes, HUB_ADMIN_BASE, HUB_EVIDENCE_STATES, shortId, type HubEvidence } from "@/utils/integrationHub";
import { openEvidence } from "./RecordsTab";
import { btnSecondary, btnSmall, HubBadge, inputCls, Pager, TableShell, TD, TH } from "./HubUi";
import { useHubList } from "./useHubList";

/** Metadata-only evidence table. Originals open through a short-lived signed URL, on demand. */
export function EvidenceTable({ base, canOpen, initialConnectionId }: { base: string; canOpen: boolean; initialConnectionId?: string }) {
    const [state, setState] = useState("");
    const [connectionId, setConnectionId] = useState(initialConnectionId ?? "");
    const [applied, setApplied] = useState(initialConnectionId ?? "");
    const filters = useMemo(() => ({ state, connectionId: applied }), [state, applied]);
    const list = useHubList<HubEvidence>(`${base}/evidence`, filters);

    return (
        <div className="space-y-3">
            <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    setApplied(connectionId.trim());
                }}
            >
                <select className={`${inputCls} w-40`} value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="">All states</option>
                    {HUB_EVIDENCE_STATES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <input className={`${inputCls} w-72`} placeholder="Connection id (UUID)" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} />
                <button type="submit" className={btnSecondary}>
                    Apply
                </button>
                <button type="button" className={`${btnSecondary} ml-auto`} onClick={list.reload} disabled={list.loading}>
                    <RefreshCw className={`h-4 w-4 ${list.loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </form>
            <TableShell
                loading={list.loading}
                error={list.error}
                empty={list.rows.length === 0}
                emptyText="No evidence objects."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Uploaded</TH>
                            <TH>File</TH>
                            <TH>Type · size</TH>
                            <TH>State</TH>
                            <TH>Visibility</TH>
                            <TH>Record</TH>
                            <TH className="text-right">Actions</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50/60">
                                <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(ev.createdAt)}</TD>
                                <TD>
                                    <p className="max-w-[260px] truncate font-medium" title={ev.originalName ?? ev.uploadId}>
                                        {ev.originalName ?? ev.uploadId}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        conn {shortId(ev.connectionId)}
                                        {ev.sha256 ? ` · sha256 ${ev.sha256.slice(0, 12)}…` : ""}
                                    </p>
                                </TD>
                                <TD className="text-xs">
                                    {ev.mimeType} · {formatBytes(ev.sizeBytes)}
                                </TD>
                                <TD>
                                    <HubBadge status={ev.state} />
                                    {ev.rejectionCode ? <div className="text-[11px] text-red-600">{ev.rejectionCode}</div> : null}
                                </TD>
                                <TD>
                                    <HubBadge status={ev.visibility} />
                                </TD>
                                <TD className="text-xs">{ev.recordId ? shortId(ev.recordId) : "unlinked"}</TD>
                                <TD className="text-right">
                                    {canOpen && ev.state === "accepted" ? (
                                        <button type="button" className={`${btnSmall} inline-flex items-center gap-1`} onClick={() => openEvidence(base, ev.id)}>
                                            Open <ExternalLink className="h-3 w-3" />
                                        </button>
                                    ) : null}
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
}

export default function EvidenceTab({ initialConnectionId }: { initialConnectionId?: string }) {
    return <EvidenceTable base={HUB_ADMIN_BASE} canOpen initialConnectionId={initialConnectionId} />;
}
