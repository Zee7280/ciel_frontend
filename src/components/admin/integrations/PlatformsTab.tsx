"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatAdminDateTime } from "@/utils/adminDate";
import { HUB_ADMIN_BASE, HUB_PLATFORM_STATUSES, hubRequest, type HubDataResponse, type HubPlatform } from "@/utils/integrationHub";
import { PlatformFormDialog, ReasonDialog } from "./HubDialogs";
import { btnPrimary, btnSecondary, btnSmall, HubBadge, inputCls, Pager, TableShell, TD, TH } from "./HubUi";
import { useHubList } from "./useHubList";

export default function PlatformsTab() {
    const [status, setStatus] = useState("");
    const [q, setQ] = useState("");
    const [qApplied, setQApplied] = useState("");
    const filters = useMemo(() => ({ status, q: qApplied }), [status, qApplied]);
    const list = useHubList<HubPlatform>(`${HUB_ADMIN_BASE}/platforms`, filters);
    const [createOpen, setCreateOpen] = useState(false);
    const [reason, setReason] = useState<{ platform: HubPlatform; to: "suspended" | "retired" } | null>(null);

    const setPlatformStatus = async (p: HubPlatform, to: string, why?: string) => {
        try {
            await hubRequest<HubDataResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms/${p.id}/status`, { method: "POST", body: { status: to, reason: why || undefined } });
            toast.success(`${p.name} is now ${to}`);
            list.reload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Status change failed");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
                <div className="w-44">
                    <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All statuses</option>
                        {HUB_PLATFORM_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setQApplied(q);
                    }}
                >
                    <input className={`${inputCls} w-56`} placeholder="Search name or slug" value={q} onChange={(e) => setQ(e.target.value)} />
                    <button type="submit" className={btnSecondary}>
                        Search
                    </button>
                </form>
                <div className="ml-auto flex gap-2">
                    <button type="button" className={btnSecondary} onClick={list.reload} disabled={list.loading}>
                        <RefreshCw className={`h-4 w-4 ${list.loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> Register platform
                    </button>
                </div>
            </div>

            <TableShell
                loading={list.loading}
                error={list.error}
                empty={list.rows.length === 0}
                emptyText="No external platforms registered yet."
                footer={<Pager page={list.page} limit={list.limit} total={list.total} onPage={list.setPage} disabled={list.loading} />}
            >
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <TH>Platform</TH>
                            <TH>Status</TH>
                            <TH>Mode</TH>
                            <TH>Event types</TH>
                            <TH>Registered</TH>
                            <TH className="text-right">Actions</TH>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.rows.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/60">
                                <TD>
                                    <Link href={`/dashboard/admin/integrations/platforms/${p.id}`} className="font-medium text-blue-700 hover:underline">
                                        {p.name}
                                    </Link>
                                    <div className="text-xs text-slate-400">{p.slug}</div>
                                </TD>
                                <TD>
                                    <HubBadge status={p.status} />
                                </TD>
                                <TD>{p.integrationMode}</TD>
                                <TD>
                                    <span className="text-xs text-slate-600">{p.approvedEventTypes.length ? p.approvedEventTypes.join(", ") : "none"}</span>
                                </TD>
                                <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(p.createdAt)}</TD>
                                <TD>
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {p.status === "sandbox" || p.status === "suspended" ? (
                                            <button type="button" className={btnSmall} onClick={() => setPlatformStatus(p, "live")}>
                                                Go live
                                            </button>
                                        ) : null}
                                        {p.status === "live" || p.status === "sandbox" ? (
                                            <button type="button" className={btnSmall} onClick={() => setReason({ platform: p, to: "suspended" })}>
                                                Suspend
                                            </button>
                                        ) : null}
                                        {p.status !== "retired" ? (
                                            <button type="button" className={`${btnSmall} text-red-700`} onClick={() => setReason({ platform: p, to: "retired" })}>
                                                Retire
                                            </button>
                                        ) : null}
                                        <Link href={`/dashboard/admin/integrations/platforms/${p.id}`} className={`${btnSmall} inline-flex items-center gap-1`}>
                                            Detail <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>

            <PlatformFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => list.reload()} />
            <ReasonDialog
                open={Boolean(reason)}
                title={reason?.to === "retired" ? `Retire ${reason.platform.name}?` : `Suspend ${reason?.platform.name}?`}
                description={
                    reason?.to === "retired"
                        ? "Retired platforms cannot authenticate, receive credentials or be edited. This cannot be undone."
                        : "Suspended platforms are refused at authentication; queued events wait until the platform is live again."
                }
                confirmLabel={reason?.to === "retired" ? "Retire" : "Suspend"}
                variant={reason?.to === "retired" ? "danger" : "warning"}
                onCancel={() => setReason(null)}
                onConfirm={async (why) => {
                    if (!reason) return;
                    await setPlatformStatus(reason.platform, reason.to, why);
                    setReason(null);
                }}
            />
        </div>
    );
}
