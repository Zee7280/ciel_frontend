"use client";

import { use, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Copy, KeyRound, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatAdminDateTime } from "@/utils/adminDate";
import {
    formatBytes,
    HUB_ADMIN_BASE,
    hubRequest,
    type HubConnection,
    type HubCredential,
    type HubDataResponse,
    type HubIssuedCredential,
    type HubPlatform,
} from "@/utils/integrationHub";
import { PlatformFormDialog, ReasonDialog } from "@/components/admin/integrations/HubDialogs";
import { btnDanger, btnPrimary, btnSecondary, btnSmall, Field, HubBadge, inputCls, KV, Modal, SectionCard, TableShell, TD, TH } from "@/components/admin/integrations/HubUi";
import { useHubResource } from "@/components/admin/integrations/useHubList";

type PlatformDetail = { platform: HubPlatform; credentials: HubCredential[]; connections: HubConnection[] };

export default function PlatformDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const detail = useHubResource<PlatformDetail>(`${HUB_ADMIN_BASE}/platforms/${id}`);
    const [editOpen, setEditOpen] = useState(false);
    const [reason, setReason] = useState<"suspended" | "retired" | null>(null);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueLabel, setIssueLabel] = useState("");
    const [issueDays, setIssueDays] = useState("");
    const [issuing, setIssuing] = useState(false);
    const [issued, setIssued] = useState<HubIssuedCredential | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoke, setRevoke] = useState<HubCredential | null>(null);
    const [revoking, setRevoking] = useState(false);

    const p = detail.data?.platform;

    const setStatus = async (to: string, why?: string) => {
        if (!p) return;
        try {
            await hubRequest<HubDataResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms/${p.id}/status`, { method: "POST", body: { status: to, reason: why || undefined } });
            toast.success(`${p.name} is now ${to}`);
            detail.reload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Status change failed");
        }
    };

    const issue = async () => {
        if (!p) return;
        setIssuing(true);
        try {
            const days = parseInt(issueDays, 10);
            const j = await hubRequest<HubDataResponse<HubIssuedCredential>>(`${HUB_ADMIN_BASE}/platforms/${p.id}/credentials`, {
                method: "POST",
                body: { label: issueLabel.trim() || undefined, expiresInDays: Number.isInteger(days) && days > 0 ? days : undefined },
            });
            setIssued(j.data);
            setIssueOpen(false);
            setIssueLabel("");
            setIssueDays("");
            setCopied(false);
            detail.reload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not issue credential");
        } finally {
            setIssuing(false);
        }
    };

    const doRevoke = async () => {
        if (!p || !revoke) return;
        setRevoking(true);
        try {
            await hubRequest(`${HUB_ADMIN_BASE}/platforms/${p.id}/credentials/${revoke.id}/revoke`, { method: "POST" });
            toast.success(`Key ${revoke.keyId} revoked`);
            setRevoke(null);
            detail.reload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Revoke failed");
        } finally {
            setRevoking(false);
        }
    };

    const copySecret = async () => {
        if (!issued) return;
        try {
            await navigator.clipboard.writeText(issued.secret);
            setCopied(true);
            toast.success("Secret copied");
        } catch {
            toast.error("Clipboard unavailable — select and copy manually");
        }
    };

    const eff = p?.effectiveSettings;

    return (
        <div className="space-y-5">
            <Link href="/dashboard/admin/integrations?tab=platforms" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" /> Platforms
            </Link>

            {detail.loading && !p ? (
                <div className="flex items-center gap-2 py-16 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
            ) : detail.error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detail.error}</div>
            ) : p ? (
                <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                                {p.name} <HubBadge status={p.status} />
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                <code>{p.slug}</code> · {p.integrationMode} · registered {formatAdminDateTime(p.createdAt)}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={btnSecondary} onClick={detail.reload} disabled={detail.loading}>
                                <RefreshCw className={`h-4 w-4 ${detail.loading ? "animate-spin" : ""}`} /> Refresh
                            </button>
                            {p.status !== "retired" ? (
                                <button type="button" className={btnSecondary} onClick={() => setEditOpen(true)}>
                                    <Pencil className="h-4 w-4" /> Edit
                                </button>
                            ) : null}
                            {p.status === "sandbox" || p.status === "suspended" ? (
                                <button type="button" className={btnPrimary} onClick={() => setStatus("live")}>
                                    Go live
                                </button>
                            ) : null}
                            {p.status === "suspended" ? (
                                <button type="button" className={btnSecondary} onClick={() => setStatus("sandbox")}>
                                    Back to sandbox
                                </button>
                            ) : null}
                            {p.status === "live" || p.status === "sandbox" ? (
                                <button type="button" className={btnSecondary} onClick={() => setReason("suspended")}>
                                    Suspend
                                </button>
                            ) : null}
                            {p.status !== "retired" ? (
                                <button type="button" className={btnDanger} onClick={() => setReason("retired")}>
                                    Retire
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {p.suspensionReason ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> {p.status} since {formatAdminDateTime(p.suspendedAt)}: {p.suspensionReason}
                        </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <SectionCard title="Platform">
                            <KV
                                items={[
                                    ["Description", p.description ?? "—"],
                                    ["Agreement reference", p.agreementReference ?? "—"],
                                    ["Approved event types", p.approvedEventTypes.length ? p.approvedEventTypes.join(", ") : "none"],
                                    ["Live since", formatAdminDateTime(p.liveAt)],
                                    ["Technical contact", p.technicalContact ? JSON.stringify(p.technicalContact) : "—"],
                                ]}
                            />
                        </SectionCard>
                        <SectionCard title="Effective limits">
                            <KV
                                items={[
                                    ["Rate limit", eff ? `${eff.rate_limit_per_minute} / min` : "—"],
                                    ["Max batch", eff ? String(eff.max_batch_size) : "—"],
                                    ["Max payload", eff ? formatBytes(eff.max_payload_bytes) : "—"],
                                    ["Max evidence", eff ? formatBytes(eff.max_evidence_bytes) : "—"],
                                    ["Evidence types", eff ? eff.evidence_mime_allowlist.join(", ") : "—"],
                                    ["Retention", eff ? `${eff.retention_days} days (logs ${eff.log_retention_days})` : "—"],
                                ]}
                            />
                        </SectionCard>
                    </div>

                    <SectionCard
                        title="Credentials"
                        action={
                            p.status !== "retired" ? (
                                <button type="button" className={btnPrimary} onClick={() => setIssueOpen(true)}>
                                    <KeyRound className="h-4 w-4" /> Issue credential
                                </button>
                            ) : null
                        }
                    >
                        <p className="mb-3 text-xs text-slate-500">
                            Vendors sign every request with HMAC-SHA256 using the key id and secret. At most two active keys (current + rotation).
                        </p>
                        <TableShell loading={false} error={null} empty={(detail.data?.credentials.length ?? 0) === 0} emptyText="No credentials issued.">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <TH>Key id</TH>
                                        <TH>Label</TH>
                                        <TH>Status</TH>
                                        <TH>Last used</TH>
                                        <TH>Expires</TH>
                                        <TH className="text-right">Actions</TH>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detail.data?.credentials.map((c) => (
                                        <tr key={c.id}>
                                            <TD>
                                                <code className="text-xs">{c.keyId}</code>
                                                <div className="text-[11px] text-slate-400">secret …{c.secretLast4}</div>
                                            </TD>
                                            <TD className="text-xs">{c.label ?? "—"}</TD>
                                            <TD>
                                                <HubBadge status={c.status === "active" ? "active" : "revoked"} />
                                            </TD>
                                            <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(c.lastUsedAt)}</TD>
                                            <TD className="whitespace-nowrap text-xs">{c.expiresAt ? formatAdminDateTime(c.expiresAt) : "never"}</TD>
                                            <TD className="text-right">
                                                {c.status === "active" ? (
                                                    <button type="button" className={`${btnSmall} text-red-700`} onClick={() => setRevoke(c)}>
                                                        Revoke
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">revoked {formatAdminDateTime(c.revokedAt)}</span>
                                                )}
                                            </TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableShell>
                    </SectionCard>

                    <SectionCard
                        title="Connections"
                        action={
                            <Link href={`/dashboard/admin/integrations?tab=connections&platformId=${p.id}`} className={btnSecondary}>
                                Manage in console
                            </Link>
                        }
                    >
                        <TableShell loading={false} error={null} empty={(detail.data?.connections.length ?? 0) === 0} emptyText="No organization connections for this platform.">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <TH>Organization</TH>
                                        <TH>Status</TH>
                                        <TH>Scopes</TH>
                                        <TH>Updated</TH>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detail.data?.connections.map((c) => (
                                        <tr key={c.id}>
                                            <TD>
                                                <Link href={`/dashboard/admin/integrations/connections/${c.id}`} className="font-medium text-blue-700 hover:underline">
                                                    {c.organizationName}
                                                </Link>
                                            </TD>
                                            <TD>
                                                <HubBadge status={c.status} />
                                            </TD>
                                            <TD className="text-xs">{c.scopes.join(", ") || "none"}</TD>
                                            <TD className="whitespace-nowrap text-xs">{formatAdminDateTime(c.updatedAt)}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableShell>
                    </SectionCard>

                    <PlatformFormDialog open={editOpen} platform={p} onClose={() => setEditOpen(false)} onSaved={() => detail.reload()} />
                    <ReasonDialog
                        open={Boolean(reason)}
                        title={reason === "retired" ? `Retire ${p.name}?` : `Suspend ${p.name}?`}
                        description={reason === "retired" ? "Retired platforms cannot authenticate or be edited. This cannot be undone." : "Suspended platforms are refused at authentication until set live again."}
                        confirmLabel={reason === "retired" ? "Retire" : "Suspend"}
                        variant={reason === "retired" ? "danger" : "warning"}
                        onCancel={() => setReason(null)}
                        onConfirm={async (why) => {
                            if (!reason) return;
                            await setStatus(reason, why);
                            setReason(null);
                        }}
                    />
                    <Modal open={issueOpen} title="Issue credential" onClose={() => setIssueOpen(false)}>
                        <div className="space-y-3">
                            <Field label="Label" hint="e.g. production, rotation-2026-11">
                                <input className={inputCls} value={issueLabel} onChange={(e) => setIssueLabel(e.target.value)} />
                            </Field>
                            <Field label="Expires in days" hint="Leave empty for no expiry">
                                <input className={inputCls} inputMode="numeric" value={issueDays} onChange={(e) => setIssueDays(e.target.value)} />
                            </Field>
                            <div className="flex justify-end gap-2">
                                <button type="button" className={btnSecondary} onClick={() => setIssueOpen(false)}>
                                    Cancel
                                </button>
                                <button type="button" className={btnPrimary} disabled={issuing} onClick={issue}>
                                    {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Issue
                                </button>
                            </div>
                        </div>
                    </Modal>
                    <Modal open={Boolean(issued)} title="Credential issued — copy the secret now" onClose={() => setIssued(null)} dismissible={false}>
                        {issued ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    This secret is shown once. It is stored encrypted and cannot be retrieved again; issue a new credential if it is lost.
                                </div>
                                <Field label="Key id (X-Hub-Key-Id)">
                                    <input className={`${inputCls} font-mono`} readOnly value={issued.keyId} onFocus={(e) => e.currentTarget.select()} />
                                </Field>
                                <Field label="Secret (HMAC-SHA256 signing key)">
                                    <div className="flex gap-2">
                                        <input className={`${inputCls} font-mono`} readOnly value={issued.secret} onFocus={(e) => e.currentTarget.select()} />
                                        <button type="button" className={btnSecondary} onClick={copySecret} aria-label={copied ? "Secret copied" : "Copy secret"} title="Copy secret">
                                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </Field>
                                <p className="text-xs text-slate-500">
                                    {issued.label ? `Label ${issued.label}. ` : ""}
                                    {issued.expiresAt ? `Expires ${formatAdminDateTime(issued.expiresAt)}.` : "No expiry."} Canonical string: v1, METHOD, path, X-Hub-Timestamp, X-Hub-Nonce, sha256(body).
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    {!copied ? <span className="text-xs text-amber-700">Copy or note the secret before closing — it will not be shown again.</span> : null}
                                    <button type="button" className={btnPrimary} onClick={() => setIssued(null)}>
                                        I have stored the secret
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </Modal>
                    <ConfirmDialog
                        open={Boolean(revoke)}
                        title={`Revoke key ${revoke?.keyId ?? ""}?`}
                        description="Requests signed with this key are refused immediately. Issue a replacement first if the vendor is live."
                        confirmLabel="Revoke"
                        variant="danger"
                        loading={revoking}
                        onCancel={() => setRevoke(null)}
                        onConfirm={doRevoke}
                    />
                </>
            ) : null}
        </div>
    );
}
