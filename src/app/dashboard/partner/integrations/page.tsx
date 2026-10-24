"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import { toast } from "sonner";
import {
    AlertTriangle,
    Check,
    ExternalLink,
    FileText,
    Link2,
    Loader2,
    Paperclip,
    PauseCircle,
    Plus,
    RefreshCw,
    X,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { isAbortError, readErrorMessage, useAbortableFetch } from "@/components/admin/useAbortableFetch";
import { formatAdminDate, formatAdminDateTime } from "@/utils/adminDate";

/* ------------------------------------------------------------------------------------------------
 * Local API types (the organization-side External Records API: /api/v1/org/integrations/*)
 * ---------------------------------------------------------------------------------------------- */

type Platform = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: string;
    approvedEventTypes: string[];
    integrationMode: string;
};

type ConnectionStatus = "proposed" | "org_approved" | "active" | "suspended" | "revoked";

type Connection = {
    id: string;
    platformId: string;
    platform?: { name: string; slug: string; status: string } | null;
    organizationName: string;
    status: ConnectionStatus;
    purpose: string | null;
    scopes: string[];
    dpaReference: string | null;
    personalFieldsAllowed: boolean;
    orgEvidenceOpenAllowed: boolean;
    retentionDays: number | null;
    referralDomain: string | null;
    validUntil: string | null;
    statusReason: string | null;
    createdAt: string;
};

type Summary = { scopeKey: string; period: string; recordCount: number; metricTotals: Record<string, number> };

type AuditRow = {
    id?: string;
    action: string;
    actorType: string;
    actorLabel: string | null;
    createdAt: string;
    details: Record<string, unknown> | null;
};

type MetricValue = { code: string; value: number; unit?: string; classification?: string };

type RecordRow = {
    id: string;
    connectionId: string;
    externalActivityId: string;
    activityType: string;
    title: string | null;
    occurredOn: string | null;
    payload: Record<string, unknown>;
    metrics: MetricValue[];
    version: number;
    status: string;
    reviewState: string;
    reviewNote: string | null;
    createdAt: string;
};

type EvidenceRow = {
    id: string;
    connectionId?: string;
    recordId?: string | null;
    uploadId: string;
    mimeType: string;
    sizeBytes: string | number | null;
    sha256: string | null;
    state: string;
    visibility: string;
    originalName: string | null;
    createdAt: string;
};

type RecordDetail = {
    record: RecordRow;
    versions: Array<{ id: string; version: number; status: string; createdAt: string; reviewState: string }>;
    evidence: EvidenceRow[];
    sourceEvent: { id: string; sourceEventId: string; eventType: string; receivedAt: string; status: string } | null;
};

type Paged<T> = { rows: T[]; total: number; page: number; limit: number };

const BASE = "/api/v1/org/integrations";
const PAGE_SIZE = 25;
const TABS = ["connections", "records", "evidence"] as const;
type Tab = (typeof TABS)[number];

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------------------------- */

function formatBytes(value: string | number | null | undefined): string {
    const n = typeof value === "string" ? Number(value) : value;
    if (!n || !Number.isFinite(n) || n <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function humanize(value: string | null | undefined): string {
    if (!value) return "—";
    return value.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function readPaged<T>(j: unknown): Paged<T> {
    const o = (j ?? {}) as Record<string, unknown>;
    return {
        rows: Array.isArray(o.rows) ? (o.rows as T[]) : [],
        total: typeof o.total === "number" ? o.total : 0,
        page: typeof o.page === "number" ? o.page : 1,
        limit: typeof o.limit === "number" ? o.limit : PAGE_SIZE,
    };
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
    const res = await authenticatedFetch(path, { signal }, { redirectToLogin: true });
    if (!res) throw new Error("Not signed in");
    if (!res.ok) throw new Error(await readErrorMessage(res, "Request failed"));
    return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await authenticatedFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) });
    if (!res) throw new Error("Not signed in");
    if (!res.ok) throw new Error(await readErrorMessage(res, "Request failed"));
    return (await res.json()) as T;
}

function connectionLabel(c: Connection): string {
    return c.platform?.name ?? c.platformId.slice(0, 8);
}

function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
    const pages = Math.max(1, Math.ceil(total / limit));
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
                Page {page} of {pages} · {total} total
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => onPage(page + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center text-slate-500">
            <div className="text-slate-300">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
                <p>{message}</p>
                <button type="button" onClick={onRetry} className="mt-2 font-medium underline">
                    Try again
                </button>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-0.5 sm:grid-cols-[180px_1fr] sm:items-start">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-900 break-words">{children}</dd>
        </div>
    );
}

/** Opens an original evidence file via a short-lived URL; only offered when the connection allows it. */
async function openEvidence(evidenceId: string) {
    try {
        const res = await authenticatedFetch(`${BASE}/evidence/${evidenceId}/view-url`, {}, { redirectToLogin: true });
        if (!res) return;
        if (res.status === 404) {
            toast.error("Opening originals is not enabled for this connection.");
            return;
        }
        if (!res.ok) {
            toast.error(await readErrorMessage(res, "Could not open evidence"));
            return;
        }
        const j = (await res.json()) as { data?: { url?: string } };
        const url = j.data?.url;
        if (!url) {
            toast.error("No view URL returned");
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open evidence");
    }
}

function EvidenceTable({ rows, canOpen }: { rows: EvidenceRow[]; canOpen: (row: EvidenceRow) => boolean }) {
    if (rows.length === 0) return <EmptyState icon={<Paperclip className="h-8 w-8" />} text="No evidence files recorded." />;
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                        <th className="px-4 py-2">File</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2">State</th>
                        <th className="px-4 py-2">Visibility</th>
                        <th className="px-4 py-2">Received</th>
                        <th className="px-4 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((e) => (
                        <tr key={e.id}>
                            <td className="px-4 py-2 font-mono text-xs text-slate-700">
                                {e.originalName ?? e.uploadId}
                                {e.sha256 ? <div className="text-[10px] text-slate-400">sha256 {e.sha256.slice(0, 16)}…</div> : null}
                            </td>
                            <td className="px-4 py-2 text-slate-700">{e.mimeType}</td>
                            <td className="px-4 py-2 text-slate-700">{formatBytes(e.sizeBytes)}</td>
                            <td className="px-4 py-2">
                                <StatusBadge status={e.state} tone={e.state === "accepted" ? "green" : e.state === "rejected" || e.state === "purged" ? "red" : "amber"} />
                            </td>
                            <td className="px-4 py-2 text-slate-700">{humanize(e.visibility)}</td>
                            <td className="px-4 py-2 text-slate-600">{formatAdminDateTime(e.createdAt)}</td>
                            <td className="px-4 py-2 text-right">
                                {canOpen(e) && e.state === "accepted" ? (
                                    <button
                                        type="button"
                                        onClick={() => void openEvidence(e.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> Open
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400">Metadata only</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------------------------------------------
 * Connections tab
 * ---------------------------------------------------------------------------------------------- */

type ConnAction = { kind: "approve" | "reject" | "suspend"; row: Connection } | null;

function ConnectDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(false);
    const [platformId, setPlatformId] = useState("");
    const [purpose, setPurpose] = useState("");
    const [scopes, setScopes] = useState<string[]>([]);
    const [dpa, setDpa] = useState("");
    const [retention, setRetention] = useState("");
    const [referral, setReferral] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        getJson<{ data: Platform[] }>(`${BASE}/platforms`)
            .then((j) => {
                if (cancelled) return;
                setPlatforms(j.data ?? []);
            })
            .catch((e) => {
                if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load platforms");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const platform = platforms.find((p) => p.id === platformId) ?? null;
    useEffect(() => {
        setScopes(platform ? [...platform.approvedEventTypes] : []);
    }, [platform]);

    const submit = async () => {
        if (!platformId) {
            toast.error("Choose a platform");
            return;
        }
        setBusy(true);
        try {
            const body: Record<string, unknown> = { platformId, scopes };
            if (purpose.trim()) body.purpose = purpose.trim();
            if (dpa.trim()) body.dpaReference = dpa.trim();
            if (retention.trim() && Number(retention) > 0) body.retentionDays = Math.floor(Number(retention));
            if (referral.trim()) body.referralDomain = referral.trim();
            await postJson(`${BASE}/connections`, body);
            toast.success("Connection request sent to CIEL PK for authorization");
            setPlatformId("");
            setPurpose("");
            setDpa("");
            setRetention("");
            setReferral("");
            onCreated();
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create the connection");
        } finally {
            setBusy(false);
        }
    };

    return (
        <ConfirmDialog
            open={open}
            title="Connect a platform"
            description="Your organization approves the connection; CIEL PK then authorizes it before any data is accepted. External records never merge with CIEL PK data."
            confirmLabel="Send request"
            loading={busy}
            confirmDisabled={!platformId || loading}
            onConfirm={submit}
            onCancel={onClose}
        >
            <div className="space-y-3 text-left">
                <label className="block text-sm">
                    <span className="font-medium text-slate-700">Platform</span>
                    <select
                        value={platformId}
                        onChange={(e) => setPlatformId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        data-autofocus
                    >
                        <option value="">{loading ? "Loading…" : "Select an approved platform"}</option>
                        {platforms.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.status})
                            </option>
                        ))}
                    </select>
                    {platform?.description ? <p className="mt-1 text-xs text-slate-500">{platform.description}</p> : null}
                </label>
                {platform ? (
                    <div className="text-sm">
                        <span className="font-medium text-slate-700">Permitted event types</span>
                        <div className="mt-1 grid gap-1 sm:grid-cols-2">
                            {platform.approvedEventTypes.map((t) => (
                                <label key={t} className="flex items-center gap-2 text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={scopes.includes(t)}
                                        onChange={(e) =>
                                            setScopes((prev) => (e.target.checked ? [...prev, t] : prev.filter((s) => s !== t)))
                                        }
                                    />
                                    <code>{t}</code>
                                </label>
                            ))}
                        </div>
                    </div>
                ) : null}
                <label className="block text-sm">
                    <span className="font-medium text-slate-700">Purpose</span>
                    <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="e.g. Plantation activity records for the 2026 drive"
                    />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-sm">
                        <span className="font-medium text-slate-700">DPA reference</span>
                        <input value={dpa} onChange={(e) => setDpa(e.target.value)} maxLength={160} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm">
                        <span className="font-medium text-slate-700">Retention (days)</span>
                        <input
                            value={retention}
                            onChange={(e) => setRetention(e.target.value.replace(/[^\d]/g, ""))}
                            inputMode="numeric"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="platform default"
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="font-medium text-slate-700">Referral domain</span>
                        <input value={referral} onChange={(e) => setReferral(e.target.value)} maxLength={255} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="app.vendor.com" />
                    </label>
                </div>
            </div>
        </ConfirmDialog>
    );
}

function ConnectionDetail({ connection, onClose }: { connection: Connection; onClose: () => void }) {
    const { begin } = useAbortableFetch();
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [audit, setAudit] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        Promise.all([
            getJson<{ data: { summaries: Summary[] } }>(`${BASE}/connections/${connection.id}`, run.signal),
            getJson<Paged<AuditRow>>(`${BASE}/audit?connectionId=${connection.id}&limit=50`, run.signal),
        ])
            .then(([detail, auditRes]) => {
                if (!run.isCurrent()) return;
                setSummaries(detail.data?.summaries ?? []);
                setAudit(readPaged<AuditRow>(auditRes).rows);
            })
            .catch((e) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Could not load connection");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, connection.id]);

    useEffect(() => {
        load();
    }, [load]);

    const metricCodes = useMemo(() => {
        const set = new Set<string>();
        summaries.forEach((s) => Object.keys(s.metricTotals ?? {}).forEach((k) => set.add(k)));
        return [...set].sort();
    }, [summaries]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{connectionLabel(connection)}</h2>
                    <p className="text-xs text-slate-500">Connection {connection.id}</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <dl className="space-y-2 px-5 py-4">
                <Field label="Status">
                    <StatusBadge status={connection.status} tone={connection.status === "org_approved" || connection.status === "proposed" ? "amber" : undefined} />
                    {connection.statusReason ? <span className="ml-2 text-xs text-slate-500">{connection.statusReason}</span> : null}
                </Field>
                <Field label="Purpose">{connection.purpose ?? "—"}</Field>
                <Field label="Event types">{connection.scopes.length ? connection.scopes.map((s) => <code key={s} className="mr-1 rounded bg-slate-100 px-1 text-xs">{s}</code>) : "—"}</Field>
                <Field label="DPA reference">{connection.dpaReference ?? "—"}</Field>
                <Field label="Personal fields">{connection.personalFieldsAllowed ? "Allowed with attestation" : "Not allowed"}</Field>
                <Field label="Open originals">{connection.orgEvidenceOpenAllowed ? "Granted to your organization" : "Metadata only"}</Field>
                <Field label="Retention">{connection.retentionDays ? `${connection.retentionDays} days` : "Platform default"}</Field>
                <Field label="Referral domain">{connection.referralDomain ?? "—"}</Field>
                <Field label="Valid until">{connection.validUntil ? formatAdminDate(connection.validUntil) : "Open-ended"}</Field>
                <Field label="Created">{formatAdminDateTime(connection.createdAt)}</Field>
            </dl>
            {loading ? (
                <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading summaries…
                </div>
            ) : error ? (
                <ErrorBox message={error} onRetry={load} />
            ) : (
                <>
                    <div className="border-t border-slate-100 px-5 py-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Summaries</h3>
                        {summaries.length === 0 ? (
                            <p className="text-sm text-slate-500">No records summarized yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Scope</th>
                                            <th className="px-3 py-2">Period</th>
                                            <th className="px-3 py-2">Records</th>
                                            {metricCodes.map((c) => (
                                                <th key={c} className="px-3 py-2">
                                                    {humanize(c)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {summaries.map((s) => (
                                            <tr key={`${s.scopeKey}|${s.period}`}>
                                                <td className="px-3 py-2 font-mono text-xs text-slate-700">{s.scopeKey}</td>
                                                <td className="px-3 py-2 text-slate-700">{s.period}</td>
                                                <td className="px-3 py-2 text-slate-700">{s.recordCount}</td>
                                                {metricCodes.map((c) => (
                                                    <td key={c} className="px-3 py-2 text-slate-700">
                                                        {s.metricTotals?.[c] ?? "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-100 px-5 py-4">
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Audit history</h3>
                        {audit.length === 0 ? (
                            <p className="text-sm text-slate-500">No audit entries.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 text-sm">
                                {audit.map((a, i) => (
                                    <li key={a.id ?? i} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                                        <span className="font-medium text-slate-800">{humanize(a.action)}</span>
                                        <span className="text-xs text-slate-500">
                                            {humanize(a.actorType)}
                                            {a.actorLabel ? ` · ${a.actorLabel}` : ""} · {formatAdminDateTime(a.createdAt)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ConnectionsTab({ connections, loading, error, onReload }: { connections: Connection[]; loading: boolean; error: string | null; onReload: () => void }) {
    const [action, setAction] = useState<ConnAction>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [connectOpen, setConnectOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = connections.find((c) => c.id === selectedId) ?? null;

    const runAction = async () => {
        if (!action) return;
        setBusy(true);
        try {
            const path =
                action.kind === "approve"
                    ? `${BASE}/connections/${action.row.id}/approve`
                    : action.kind === "reject"
                      ? `${BASE}/connections/${action.row.id}/reject`
                      : `${BASE}/connections/${action.row.id}/request-suspension`;
            await postJson(path, action.kind === "approve" ? {} : { reason: reason.trim() || undefined });
            toast.success(
                action.kind === "approve"
                    ? "Connection approved — waiting for CIEL PK authorization"
                    : action.kind === "reject"
                      ? "Connection rejected"
                      : "Connection suspended",
            );
            setAction(null);
            setReason("");
            onReload();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Action failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                    Platforms connected to your organization. You approve or reject proposals; CIEL PK authorizes them.
                </p>
                <button
                    type="button"
                    onClick={() => setConnectOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" /> Connect a platform
                </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading connections…
                    </div>
                ) : error ? (
                    <ErrorBox message={error} onRetry={onReload} />
                ) : connections.length === 0 ? (
                    <EmptyState icon={<Link2 className="h-8 w-8" />} text="No platform connections yet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Platform</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Event types</th>
                                    <th className="px-4 py-2">Created</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {connections.map((c) => (
                                    <tr
                                        key={c.id}
                                        className={`cursor-pointer hover:bg-slate-50 ${selectedId === c.id ? "bg-blue-50/60" : ""}`}
                                        onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">{connectionLabel(c)}</div>
                                            <div className="text-xs text-slate-500">{c.purpose ?? c.platform?.slug ?? ""}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={c.status} tone={c.status === "org_approved" || c.status === "proposed" ? "amber" : undefined} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{c.scopes.length} type{c.scopes.length === 1 ? "" : "s"}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatAdminDate(c.createdAt)}</td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            {c.status === "proposed" ? (
                                                <div className="inline-flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAction({ kind: "approve", row: c })}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                                    >
                                                        <Check className="h-3.5 w-3.5" /> Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAction({ kind: "reject", row: c })}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                                    >
                                                        <X className="h-3.5 w-3.5" /> Reject
                                                    </button>
                                                </div>
                                            ) : c.status === "active" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setAction({ kind: "suspend", row: c })}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                                >
                                                    <PauseCircle className="h-3.5 w-3.5" /> Request suspension
                                                </button>
                                            ) : c.status === "org_approved" ? (
                                                <span className="text-xs text-slate-500">Awaiting CIEL PK</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {selected ? <ConnectionDetail key={selected.id} connection={selected} onClose={() => setSelectedId(null)} /> : null}

            <ConfirmDialog
                open={action !== null}
                title={
                    action?.kind === "approve"
                        ? "Approve this connection?"
                        : action?.kind === "reject"
                          ? "Reject this connection?"
                          : "Request suspension?"
                }
                description={
                    action
                        ? action.kind === "approve"
                            ? `${connectionLabel(action.row)} will be able to send the listed event types once CIEL PK authorizes the connection.`
                            : action.kind === "reject"
                              ? `${connectionLabel(action.row)} will not be connected. A new proposal is needed to try again.`
                              : `${connectionLabel(action.row)} will stop being accepted immediately. CIEL PK can resume it later.`
                        : undefined
                }
                confirmLabel={action?.kind === "approve" ? "Approve" : action?.kind === "reject" ? "Reject" : "Suspend"}
                variant={action?.kind === "approve" ? "default" : action?.kind === "reject" ? "danger" : "warning"}
                loading={busy}
                onConfirm={runAction}
                onCancel={() => {
                    if (busy) return;
                    setAction(null);
                    setReason("");
                }}
            >
                {action && action.kind !== "approve" ? (
                    <label className="block text-left text-sm">
                        <span className="font-medium text-slate-700">Reason (optional)</span>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            data-autofocus
                        />
                    </label>
                ) : null}
            </ConfirmDialog>

            <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} onCreated={onReload} />
        </div>
    );
}

/* ------------------------------------------------------------------------------------------------
 * Records tab
 * ---------------------------------------------------------------------------------------------- */

function RecordDetailPanel({ recordId, connections, onClose }: { recordId: string; connections: Connection[]; onClose: () => void }) {
    const { begin } = useAbortableFetch();
    const [detail, setDetail] = useState<RecordDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        getJson<{ data: RecordDetail }>(`${BASE}/records/${recordId}`, run.signal)
            .then((j) => {
                if (run.isCurrent()) setDetail(j.data);
            })
            .catch((e) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Could not load record");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, recordId]);

    useEffect(() => {
        load();
    }, [load]);

    const connection = detail ? connections.find((c) => c.id === detail.record.connectionId) ?? null : null;
    const canOpen = Boolean(connection?.orgEvidenceOpenAllowed);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{detail?.record.title ?? detail?.record.externalActivityId ?? "Record"}</h2>
                    <p className="text-xs text-slate-500">{detail ? `${humanize(detail.record.activityType)} · version ${detail.record.version}` : recordId}</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
                    <X className="h-4 w-4" />
                </button>
            </div>
            {loading ? (
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading record…
                </div>
            ) : error || !detail ? (
                <ErrorBox message={error ?? "Record not found"} onRetry={load} />
            ) : (
                <div className="space-y-5 px-5 py-4">
                    <dl className="space-y-2">
                        <Field label="Connection">{connection ? connectionLabel(connection) : detail.record.connectionId}</Field>
                        <Field label="External id">
                            <code className="text-xs">{detail.record.externalActivityId}</code>
                        </Field>
                        <Field label="Occurred on">{detail.record.occurredOn ? formatAdminDate(detail.record.occurredOn) : "—"}</Field>
                        <Field label="Status">
                            <StatusBadge status={detail.record.status} tone={detail.record.status === "current" ? "green" : "slate"} />
                            <StatusBadge status={detail.record.reviewState} className="ml-2" tone={detail.record.reviewState === "reviewed" ? "blue" : detail.record.reviewState === "disputed" ? "red" : "slate"} />
                        </Field>
                        {detail.record.reviewNote ? <Field label="Review note">{detail.record.reviewNote}</Field> : null}
                        {detail.sourceEvent ? (
                            <Field label="Source event">
                                <code className="text-xs">{detail.sourceEvent.sourceEventId}</code> · {detail.sourceEvent.eventType} · received {formatAdminDateTime(detail.sourceEvent.receivedAt)}
                            </Field>
                        ) : null}
                    </dl>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Metrics</h3>
                        {detail.record.metrics.length === 0 ? (
                            <p className="text-sm text-slate-500">No metrics on this record.</p>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Metric</th>
                                        <th className="px-3 py-2">Value</th>
                                        <th className="px-3 py-2">Unit</th>
                                        <th className="px-3 py-2">Classification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detail.record.metrics.map((m) => (
                                        <tr key={m.code}>
                                            <td className="px-3 py-2 text-slate-800">{humanize(m.code)}</td>
                                            <td className="px-3 py-2 font-medium text-slate-900">{m.value}</td>
                                            <td className="px-3 py-2 text-slate-600">{m.unit ?? "—"}</td>
                                            <td className="px-3 py-2 text-slate-600">{humanize(m.classification)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Payload</h3>
                        <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(detail.record.payload ?? {}, null, 2)}</pre>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Versions</h3>
                        <ul className="divide-y divide-slate-100 text-sm">
                            {detail.versions.map((v) => (
                                <li key={v.id} className="flex items-center justify-between py-1.5">
                                    <span className="text-slate-800">
                                        v{v.version} <StatusBadge status={v.status} className="ml-1" tone={v.status === "current" ? "green" : v.status === "voided" ? "red" : "slate"} />
                                    </span>
                                    <span className="text-xs text-slate-500">{formatAdminDateTime(v.createdAt)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">Evidence</h3>
                        <EvidenceTable rows={detail.evidence} canOpen={() => canOpen} />
                    </div>
                </div>
            )}
        </div>
    );
}

function RecordsTab({ connections }: { connections: Connection[] }) {
    const { begin } = useAbortableFetch();
    const [connectionId, setConnectionId] = useState("");
    const [activityType, setActivityType] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Paged<RecordRow>>({ rows: [], total: 0, page: 1, limit: PAGE_SIZE });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const load = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (connectionId) params.set("connectionId", connectionId);
        if (activityType.trim()) params.set("activityType", activityType.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (q.trim()) params.set("q", q.trim());
        getJson<unknown>(`${BASE}/records?${params.toString()}`, run.signal)
            .then((j) => {
                if (run.isCurrent()) setData(readPaged<RecordRow>(j));
            })
            .catch((e) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Could not load records");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, page, connectionId, activityType, from, to, q]);

    useEffect(() => {
        load();
    }, [load]);

    const connName = (id: string) => {
        const c = connections.find((x) => x.id === id);
        return c ? connectionLabel(c) : id.slice(0, 8);
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
                <select value={connectionId} onChange={(e) => { setConnectionId(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:col-span-2">
                    <option value="">All connections</option>
                    {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                            {connectionLabel(c)}
                        </option>
                    ))}
                </select>
                <input value={activityType} onChange={(e) => { setActivityType(e.target.value); setPage(1); }} placeholder="Activity type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search id or title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading records…
                    </div>
                ) : error ? (
                    <ErrorBox message={error} onRetry={load} />
                ) : data.rows.length === 0 ? (
                    <EmptyState icon={<FileText className="h-8 w-8" />} text="No external records match these filters." />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2">Activity</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Connection</th>
                                        <th className="px-4 py-2">Occurred</th>
                                        <th className="px-4 py-2">Metrics</th>
                                        <th className="px-4 py-2">Review</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.rows.map((r) => (
                                        <tr key={r.id} className={`cursor-pointer hover:bg-slate-50 ${selectedId === r.id ? "bg-blue-50/60" : ""}`} onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{r.title ?? r.externalActivityId}</div>
                                                <div className="font-mono text-[11px] text-slate-500">{r.externalActivityId} · v{r.version}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{humanize(r.activityType)}</td>
                                            <td className="px-4 py-3 text-slate-700">{connName(r.connectionId)}</td>
                                            <td className="px-4 py-3 text-slate-600">{r.occurredOn ? formatAdminDate(r.occurredOn) : "—"}</td>
                                            <td className="px-4 py-3 text-xs text-slate-700">
                                                {r.metrics.length ? r.metrics.map((m) => `${humanize(m.code)}: ${m.value}`).join(" · ") : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={r.reviewState} tone={r.reviewState === "reviewed" ? "blue" : r.reviewState === "disputed" ? "red" : "slate"} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager page={data.page} total={data.total} limit={data.limit} onPage={setPage} />
                    </>
                )}
            </div>
            {selectedId ? <RecordDetailPanel key={selectedId} recordId={selectedId} connections={connections} onClose={() => setSelectedId(null)} /> : null}
        </div>
    );
}

/* ------------------------------------------------------------------------------------------------
 * Evidence tab
 * ---------------------------------------------------------------------------------------------- */

function EvidenceTab({ connections }: { connections: Connection[] }) {
    const { begin } = useAbortableFetch();
    const [connectionId, setConnectionId] = useState("");
    const [state, setState] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Paged<EvidenceRow>>({ rows: [], total: 0, page: 1, limit: PAGE_SIZE });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (connectionId) params.set("connectionId", connectionId);
        if (state) params.set("state", state);
        getJson<unknown>(`${BASE}/evidence?${params.toString()}`, run.signal)
            .then((j) => {
                if (run.isCurrent()) setData(readPaged<EvidenceRow>(j));
            })
            .catch((e) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Could not load evidence");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, page, connectionId, state]);

    useEffect(() => {
        load();
    }, [load]);

    const allowed = useMemo(() => new Set(connections.filter((c) => c.orgEvidenceOpenAllowed).map((c) => c.id)), [connections]);

    return (
        <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
                <select value={connectionId} onChange={(e) => { setConnectionId(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
                    <option value="">All connections</option>
                    {connections.map((c) => (
                        <option key={c.id} value={c.id}>
                            {connectionLabel(c)}
                        </option>
                    ))}
                </select>
                <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Any state</option>
                    <option value="accepted">Accepted</option>
                    <option value="quarantined">Quarantined</option>
                    <option value="rejected">Rejected</option>
                    <option value="purged">Purged</option>
                </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading evidence…
                    </div>
                ) : error ? (
                    <ErrorBox message={error} onRetry={load} />
                ) : (
                    <>
                        <EvidenceTable rows={data.rows} canOpen={(e) => Boolean(e.connectionId && allowed.has(e.connectionId))} />
                        <Pager page={data.page} total={data.total} limit={data.limit} onPage={setPage} />
                    </>
                )}
            </div>
            <p className="text-xs text-slate-500">
                Evidence files stay in the external records repository. Original files open only where CIEL PK has granted that permission on the connection.
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------------------------------- */

function ExternalRecordsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "connections";
    const { begin } = useAbortableFetch();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConnections = useCallback(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        getJson<unknown>(`${BASE}/connections?limit=100`, run.signal)
            .then((j) => {
                if (run.isCurrent()) setConnections(readPaged<Connection>(j).rows);
            })
            .catch((e) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Could not load connections");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin]);

    useEffect(() => {
        loadConnections();
    }, [loadConnections]);

    const setTab = (t: Tab) => {
        const p = new URLSearchParams(searchParams.toString());
        p.set("tab", t);
        router.replace(`/dashboard/partner/integrations?${p.toString()}`);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">External Records</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Activity records, metrics and evidence submitted by connected platforms for your organization. These are kept separately from CIEL PK academic records and never change attendance, reports or scores.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadConnections}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
                {TABS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                        {humanize(t)}
                    </button>
                ))}
            </div>
            {tab === "connections" ? (
                <ConnectionsTab connections={connections} loading={loading} error={error} onReload={loadConnections} />
            ) : tab === "records" ? (
                <RecordsTab connections={connections} />
            ) : (
                <EvidenceTab connections={connections} />
            )}
        </div>
    );
}

export default function PartnerExternalRecordsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="h-6 w-6 animate-spin" /> Loading…
                </div>
            }
        >
            <ExternalRecordsPageInner />
        </Suspense>
    );
}
