"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatAdminDateTime } from "@/utils/adminDate";
import { HUB_ADMIN_BASE, shortId, type HubAudit } from "@/utils/integrationHub";
import { btnSecondary, inputCls, JsonBlock, Modal, Pager, TableShell, TD, TH } from "./HubUi";
import { useHubList } from "./useHubList";

export function AuditTable({ base, lockedConnectionId }: { base: string; lockedConnectionId?: string }) {
    const [connectionId, setConnectionId] = useState(lockedConnectionId ?? "");
    const [action, setAction] = useState("");
    const [targetType, setTargetType] = useState("");
    const [applied, setApplied] = useState({ connectionId: lockedConnectionId ?? "", action: "", targetType: "" });
    const filters = useMemo(() => applied, [applied]);
    const list = useHubList<HubAudit>(`${base}/audit`, filters);
    const [open, setOpen] = useState<HubAudit | null>(null);

    return (
        <div className="space-y-3">
            <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    setApplied({ connectionId: connectionId.trim(), action: action.trim().toUpperCase(), targetType: targetType.trim() });
                }}
            >
                {!lockedConnectionId ? (
                    <input className={`${inputCls} w-72`} placeholder="Connection id (UUID)" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} />
                ) : null}
                <input className={`${inputCls} w-56`} placeholder="Action, e.g. CONNECTION_AUTHORIZED" value={action} onChange={(e) => setAction(e.target.value)} />
                <select className={`${inputCls} w-40`} value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                    <option value="">Any target</option>
                    {["platform", "credential", "connection", "event", "record", "evidence", "metric", "system"].map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
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
                emptyText="No audit entries."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>When</TH>
                            <TH>Actor</TH>
                            <TH>Action</TH>
                            <TH>Target</TH>
                            <TH>Connection</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((a) => (
                            <tr key={a.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => setOpen(a)}>
                                <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(a.createdAt)}</TD>
                                <TD className="text-xs">
                                    <span className="font-medium">{a.actorType}</span>
                                    {a.actorLabel ? <span className="text-slate-500"> · {a.actorLabel}</span> : null}
                                </TD>
                                <TD>
                                    <code className="text-xs">{a.action}</code>
                                </TD>
                                <TD className="text-xs">
                                    {a.targetType} {a.targetId ? shortId(a.targetId) : ""}
                                </TD>
                                <TD className="text-xs">{a.connectionId ? shortId(a.connectionId) : "—"}</TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
            <Modal open={Boolean(open)} title={open?.action ?? "Audit entry"} onClose={() => setOpen(null)}>
                {open ? (
                    <div className="space-y-3 text-sm">
                        <p>
                            {formatAdminDateTime(open.createdAt)} · {open.actorType} {open.actorLabel ?? open.actorId ?? ""}
                            {open.ip ? ` · ${open.ip}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                            Target {open.targetType} {open.targetId ?? ""} {open.connectionId ? `· connection ${open.connectionId}` : ""}
                        </p>
                        <JsonBlock value={open.details} />
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}

export default function AuditTab() {
    return <AuditTable base={HUB_ADMIN_BASE} />;
}
