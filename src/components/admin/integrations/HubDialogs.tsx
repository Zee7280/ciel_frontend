"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
    HUB_ADMIN_BASE,
    HUB_EVENT_TYPES,
    HUB_METRIC_AGGREGATIONS,
    HUB_METRIC_CLASSIFICATIONS,
    hubRequest,
    type HubConnection,
    type HubDataResponse,
    type HubMetric,
    type HubOrgSearchRow,
    type HubPlatform,
} from "@/utils/integrationHub";
import { btnPrimary, btnSecondary, Field, inputCls, Modal, ScopeChecklist, Toggle } from "./HubUi";

/* ------------------------------------------------------------------------------------------ */
/* Reason dialog (suspend / revoke / retire)                                                   */
/* ------------------------------------------------------------------------------------------ */

export function ReasonDialog({
    open,
    title,
    description,
    confirmLabel,
    variant = "warning",
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    variant?: "default" | "warning" | "danger";
    onConfirm: (reason: string) => Promise<void>;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) setReason("");
    }, [open]);
    return (
        <ConfirmDialog
            open={open}
            title={title}
            description={description}
            confirmLabel={confirmLabel}
            variant={variant}
            loading={busy}
            onCancel={onCancel}
            onConfirm={async () => {
                setBusy(true);
                try {
                    await onConfirm(reason.trim());
                } finally {
                    setBusy(false);
                }
            }}
        >
            <textarea
                className={`${inputCls} mt-3 min-h-[80px]`}
                placeholder="Reason (recorded in the audit trail)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
        </ConfirmDialog>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Platform create / edit                                                                       */
/* ------------------------------------------------------------------------------------------ */

type PlatformForm = {
    name: string;
    slug: string;
    description: string;
    integrationMode: "push" | "pull" | "file";
    approvedEventTypes: string[];
    agreementReference: string;
    rate_limit_per_minute: string;
    max_batch_size: string;
    max_payload_bytes: string;
    max_evidence_bytes: string;
    retention_days: string;
    log_retention_days: string;
};

function platformToForm(p?: HubPlatform | null): PlatformForm {
    const s = p?.settings ?? {};
    const n = (v: number | undefined) => (typeof v === "number" ? String(v) : "");
    return {
        name: p?.name ?? "",
        slug: p?.slug ?? "",
        description: p?.description ?? "",
        integrationMode: p?.integrationMode ?? "push",
        approvedEventTypes: p?.approvedEventTypes ?? [...HUB_EVENT_TYPES],
        agreementReference: p?.agreementReference ?? "",
        rate_limit_per_minute: n(s.rate_limit_per_minute),
        max_batch_size: n(s.max_batch_size),
        max_payload_bytes: n(s.max_payload_bytes),
        max_evidence_bytes: n(s.max_evidence_bytes),
        retention_days: n(s.retention_days),
        log_retention_days: n(s.log_retention_days),
    };
}

function numOrUndef(v: string): number | undefined {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export function PlatformFormDialog({
    open,
    platform,
    onClose,
    onSaved,
}: {
    open: boolean;
    platform?: HubPlatform | null;
    onClose: () => void;
    onSaved: (p: HubPlatform) => void;
}) {
    const [form, setForm] = useState<PlatformForm>(() => platformToForm(platform));
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) setForm(platformToForm(platform));
    }, [open, platform]);
    const set = <K extends keyof PlatformForm>(k: K, v: PlatformForm[K]) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async () => {
        if (form.name.trim().length < 2) {
            toast.error("Name is required");
            return;
        }
        setBusy(true);
        try {
            const settings: Record<string, number> = {};
            for (const k of ["rate_limit_per_minute", "max_batch_size", "max_payload_bytes", "max_evidence_bytes", "retention_days", "log_retention_days"] as const) {
                const n = numOrUndef(form[k]);
                if (n !== undefined) settings[k] = n;
            }
            const body: Record<string, unknown> = {
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                integrationMode: form.integrationMode,
                approvedEventTypes: form.approvedEventTypes,
                settings,
                agreementReference: form.agreementReference.trim() || undefined,
            };
            if (!platform && form.slug.trim()) body.slug = form.slug.trim().toLowerCase();
            const j = platform
                ? await hubRequest<HubDataResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms/${platform.id}`, { method: "PATCH", body })
                : await hubRequest<HubDataResponse<HubPlatform>>(`${HUB_ADMIN_BASE}/platforms`, { method: "POST", body });
            toast.success(platform ? "Platform updated" : "Platform registered in sandbox");
            onSaved(j.data);
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Save failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} title={platform ? `Edit ${platform.name}` : "Register external platform"} onClose={onClose} wide>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                    <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Slug" hint={platform ? "Fixed after registration" : "Lowercase letters, digits, dashes. Auto-generated when empty."}>
                    <input className={inputCls} value={form.slug} disabled={Boolean(platform)} onChange={(e) => set("slug", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Description">
                        <textarea className={`${inputCls} min-h-[70px]`} value={form.description} onChange={(e) => set("description", e.target.value)} />
                    </Field>
                </div>
                <Field label="Integration mode" hint="Push is the universal API; pull and file need an adapter">
                    <select className={inputCls} value={form.integrationMode} onChange={(e) => set("integrationMode", e.target.value as PlatformForm["integrationMode"])}>
                        <option value="push">push</option>
                        <option value="pull">pull</option>
                        <option value="file">file</option>
                    </select>
                </Field>
                <Field label="Agreement reference">
                    <input className={inputCls} value={form.agreementReference} onChange={(e) => set("agreementReference", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Approved event types">
                        <ScopeChecklist options={HUB_EVENT_TYPES} value={form.approvedEventTypes} onChange={(v) => set("approvedEventTypes", v)} />
                    </Field>
                </div>
                <Field label="Rate limit / minute" hint="Default 120">
                    <input className={inputCls} inputMode="numeric" value={form.rate_limit_per_minute} onChange={(e) => set("rate_limit_per_minute", e.target.value)} />
                </Field>
                <Field label="Max batch size" hint="Default 50, hard cap 200">
                    <input className={inputCls} inputMode="numeric" value={form.max_batch_size} onChange={(e) => set("max_batch_size", e.target.value)} />
                </Field>
                <Field label="Max payload bytes" hint="Default 262144">
                    <input className={inputCls} inputMode="numeric" value={form.max_payload_bytes} onChange={(e) => set("max_payload_bytes", e.target.value)} />
                </Field>
                <Field label="Max evidence bytes" hint="Default 10 MB">
                    <input className={inputCls} inputMode="numeric" value={form.max_evidence_bytes} onChange={(e) => set("max_evidence_bytes", e.target.value)} />
                </Field>
                <Field label="Retention days" hint="Records and evidence; default 365">
                    <input className={inputCls} inputMode="numeric" value={form.retention_days} onChange={(e) => set("retention_days", e.target.value)} />
                </Field>
                <Field label="Log retention days" hint="Rejected / dead events; default 30">
                    <input className={inputCls} inputMode="numeric" value={form.log_retention_days} onChange={(e) => set("log_retention_days", e.target.value)} />
                </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={onClose}>
                    Cancel
                </button>
                <button type="button" className={btnPrimary} disabled={busy} onClick={submit}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {platform ? "Save changes" : "Register"}
                </button>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Connection propose / edit                                                                    */
/* ------------------------------------------------------------------------------------------ */

type ConnectionForm = {
    platformId: string;
    organizationId: string;
    organizationName: string;
    purpose: string;
    scopes: string[];
    dpaReference: string;
    personalFieldsAllowed: boolean;
    orgEvidenceOpenAllowed: boolean;
    retentionDays: string;
    referralDomain: string;
    validUntil: string;
};

function connectionToForm(c?: HubConnection | null, platformId?: string): ConnectionForm {
    return {
        platformId: c?.platformId ?? platformId ?? "",
        organizationId: c?.organizationId ?? "",
        organizationName: c?.organizationName ?? "",
        purpose: c?.purpose ?? "",
        scopes: c?.scopes ?? [],
        dpaReference: c?.dpaReference ?? "",
        personalFieldsAllowed: c?.personalFieldsAllowed ?? false,
        orgEvidenceOpenAllowed: c?.orgEvidenceOpenAllowed ?? false,
        retentionDays: c?.retentionDays ? String(c.retentionDays) : "",
        referralDomain: c?.referralDomain ?? "",
        validUntil: c?.validUntil ? c.validUntil.slice(0, 10) : "",
    };
}

export function ConnectionFormDialog({
    open,
    connection,
    platforms,
    defaultPlatformId,
    onClose,
    onSaved,
}: {
    open: boolean;
    connection?: HubConnection | null;
    /** Platforms available for a new proposal (ignored when editing). */
    platforms: Pick<HubPlatform, "id" | "name" | "slug" | "status" | "approvedEventTypes">[];
    defaultPlatformId?: string;
    onClose: () => void;
    onSaved: (c: HubConnection) => void;
}) {
    const [form, setForm] = useState<ConnectionForm>(() => connectionToForm(connection, defaultPlatformId));
    const [busy, setBusy] = useState(false);
    const [orgQuery, setOrgQuery] = useState("");
    const [orgResults, setOrgResults] = useState<HubOrgSearchRow[]>([]);
    const [orgSearching, setOrgSearching] = useState(false);
    useEffect(() => {
        if (open) {
            setForm(connectionToForm(connection, defaultPlatformId));
            setOrgQuery("");
            setOrgResults([]);
        }
    }, [open, connection, defaultPlatformId]);
    const set = <K extends keyof ConnectionForm>(k: K, v: ConnectionForm[K]) => setForm((f) => ({ ...f, [k]: v }));

    const selectedPlatform = platforms.find((p) => p.id === form.platformId);
    const scopeOptions: readonly string[] = connection ? HUB_EVENT_TYPES : (selectedPlatform?.approvedEventTypes ?? [...HUB_EVENT_TYPES]);

    useEffect(() => {
        if (!open || connection) return;
        const q = orgQuery.trim();
        if (q.length < 2) {
            setOrgResults([]);
            return;
        }
        const handle = setTimeout(() => {
            setOrgSearching(true);
            hubRequest<HubDataResponse<HubOrgSearchRow[]>>(`${HUB_ADMIN_BASE}/organizations/search?q=${encodeURIComponent(q)}`)
                .then((j) => setOrgResults(Array.isArray(j.data) ? j.data : []))
                .catch(() => setOrgResults([]))
                .finally(() => setOrgSearching(false));
        }, 300);
        return () => clearTimeout(handle);
    }, [orgQuery, open, connection]);

    const submit = async () => {
        if (!connection && (!form.platformId || !form.organizationId)) {
            toast.error("Pick a platform and an organization");
            return;
        }
        setBusy(true);
        try {
            const retention = numOrUndef(form.retentionDays);
            const common = {
                purpose: form.purpose.trim() || undefined,
                scopes: form.scopes,
                dpaReference: form.dpaReference.trim() || undefined,
                personalFieldsAllowed: form.personalFieldsAllowed,
                orgEvidenceOpenAllowed: form.orgEvidenceOpenAllowed,
                retentionDays: retention,
                referralDomain: form.referralDomain.trim() || undefined,
            };
            const j = connection
                ? await hubRequest<HubDataResponse<HubConnection>>(`${HUB_ADMIN_BASE}/connections/${connection.id}`, {
                      method: "PATCH",
                      body: { ...common, validUntil: form.validUntil ? form.validUntil : "" },
                  })
                : await hubRequest<HubDataResponse<HubConnection>>(`${HUB_ADMIN_BASE}/connections`, {
                      method: "POST",
                      body: { ...common, platformId: form.platformId, organizationId: form.organizationId },
                  });
            toast.success(connection ? "Connection updated" : "Connection proposed — the organization must approve it next");
            onSaved(j.data);
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Save failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} title={connection ? `Edit connection · ${connection.organizationName}` : "Propose connection"} onClose={onClose} wide>
            <div className="grid gap-4 sm:grid-cols-2">
                {connection ? (
                    <>
                        <Field label="Platform">
                            <input className={inputCls} disabled value={connection.platform?.name ?? connection.platformId} />
                        </Field>
                        <Field label="Organization">
                            <input className={inputCls} disabled value={connection.organizationName} />
                        </Field>
                    </>
                ) : (
                    <>
                        <Field label="Platform">
                            <select
                                className={inputCls}
                                value={form.platformId}
                                onChange={(e) => {
                                    const p = platforms.find((x) => x.id === e.target.value);
                                    setForm((f) => ({ ...f, platformId: e.target.value, scopes: p?.approvedEventTypes ?? [] }));
                                }}
                            >
                                <option value="">Select a platform…</option>
                                {platforms
                                    .filter((p) => p.status !== "retired")
                                    .map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.status})
                                        </option>
                                    ))}
                            </select>
                        </Field>
                        <Field label="Organization" hint="Approved organizations only">
                            {form.organizationId ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                                    <span className="truncate font-medium">{form.organizationName}</span>
                                    <button type="button" className="text-xs text-slate-600 underline" onClick={() => setForm((f) => ({ ...f, organizationId: "", organizationName: "" }))}>
                                        change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <input className={`${inputCls} pl-8`} placeholder="Search by name…" value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} />
                                    {orgSearching ? <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" /> : null}
                                    {orgResults.length > 0 ? (
                                        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {orgResults.map((o) => (
                                                <li key={o.id}>
                                                    <button
                                                        type="button"
                                                        disabled={o.verificationStatus !== "APPROVED"}
                                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                                                        onClick={() => setForm((f) => ({ ...f, organizationId: o.id, organizationName: o.name }))}
                                                    >
                                                        <span className="truncate">{o.name}</span>
                                                        <span className="ml-2 shrink-0 text-[11px] text-slate-500">
                                                            {o.orgType} · {o.verificationStatus}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            )}
                        </Field>
                    </>
                )}
                <div className="sm:col-span-2">
                    <Field label="Purpose">
                        <textarea className={`${inputCls} min-h-[60px]`} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
                    </Field>
                </div>
                <div className="sm:col-span-2">
                    <Field label="Scopes (event types this connection may send)">
                        <ScopeChecklist options={scopeOptions} value={form.scopes} onChange={(v) => set("scopes", v)} />
                    </Field>
                </div>
                <Field label="DPA / agreement reference">
                    <input className={inputCls} value={form.dpaReference} onChange={(e) => set("dpaReference", e.target.value)} />
                </Field>
                <Field label="Retention days" hint="Overrides the platform default when set">
                    <input className={inputCls} inputMode="numeric" value={form.retentionDays} onChange={(e) => set("retentionDays", e.target.value)} />
                </Field>
                <Field label="Referral domain" hint="Bare host the organization may link out to, e.g. app.vendor.com">
                    <input className={inputCls} value={form.referralDomain} onChange={(e) => set("referralDomain", e.target.value)} />
                </Field>
                {connection ? (
                    <Field label="Valid until" hint="Leave empty for no expiry">
                        <input type="date" className={inputCls} value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
                    </Field>
                ) : null}
                <div className="sm:col-span-2 grid gap-2">
                    <Toggle
                        checked={form.personalFieldsAllowed}
                        onChange={(v) => set("personalFieldsAllowed", v)}
                        label="Personal fields allowed"
                        hint="Off: any personal field in a payload is rejected at intake. On: the vendor must attach a consent attestation per record."
                    />
                    <Toggle
                        checked={form.orgEvidenceOpenAllowed}
                        onChange={(v) => set("orgEvidenceOpenAllowed", v)}
                        label="Organization may open original evidence"
                        hint="Off: the organization sees evidence metadata only."
                    />
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={onClose}>
                    Cancel
                </button>
                <button type="button" className={btnPrimary} disabled={busy} onClick={submit}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {connection ? "Save changes" : "Propose"}
                </button>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Metric create / edit                                                                         */
/* ------------------------------------------------------------------------------------------ */

type MetricForm = {
    code: string;
    name: string;
    unit: string;
    dataType: "number" | "integer";
    aggregation: HubMetric["aggregation"];
    defaultClassification: HubMetric["defaultClassification"];
    minValue: string;
    maxValue: string;
    sector: string;
    sdgs: string;
    methodologyNotes: string;
    active: boolean;
};

function metricToForm(m?: HubMetric | null): MetricForm {
    return {
        code: m?.code ?? "",
        name: m?.name ?? "",
        unit: m?.unit ?? "",
        dataType: m?.dataType ?? "number",
        aggregation: m?.aggregation ?? "sum",
        defaultClassification: m?.defaultClassification ?? "observed",
        minValue: m?.minValue ?? "",
        maxValue: m?.maxValue ?? "",
        sector: m?.sector ?? "",
        sdgs: (m?.sdgs ?? []).join(","),
        methodologyNotes: m?.methodologyNotes ?? "",
        active: m?.active ?? true,
    };
}

export function MetricFormDialog({ open, metric, onClose, onSaved }: { open: boolean; metric?: HubMetric | null; onClose: () => void; onSaved: (m: HubMetric) => void }) {
    const [form, setForm] = useState<MetricForm>(() => metricToForm(metric));
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) setForm(metricToForm(metric));
    }, [open, metric]);
    const set = <K extends keyof MetricForm>(k: K, v: MetricForm[K]) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!/^[a-z][a-z0-9_]{1,63}$/.test(form.code)) {
            toast.error("Code must be lowercase letters, digits and underscores (e.g. trees_planted)");
            return;
        }
        if (form.name.trim().length < 2 || !form.unit.trim()) {
            toast.error("Name and unit are required");
            return;
        }
        setBusy(true);
        try {
            const sdgs = form.sdgs
                .split(",")
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => Number.isInteger(n) && n >= 1 && n <= 17);
            const body = {
                code: form.code,
                name: form.name.trim(),
                unit: form.unit.trim(),
                dataType: form.dataType,
                aggregation: form.aggregation,
                defaultClassification: form.defaultClassification,
                minValue: form.minValue.trim() === "" ? null : Number(form.minValue),
                maxValue: form.maxValue.trim() === "" ? null : Number(form.maxValue),
                sector: form.sector.trim() || undefined,
                sdgs,
                methodologyNotes: form.methodologyNotes.trim() || undefined,
                active: form.active,
            };
            const j = metric
                ? await hubRequest<HubDataResponse<HubMetric>>(`${HUB_ADMIN_BASE}/metrics/${metric.id}`, { method: "PATCH", body })
                : await hubRequest<HubDataResponse<HubMetric>>(`${HUB_ADMIN_BASE}/metrics`, { method: "POST", body });
            toast.success(metric ? "Metric updated" : "Metric added to the catalog");
            onSaved(j.data);
            onClose();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Save failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} title={metric ? `Edit metric · ${metric.code}` : "Add metric definition"} onClose={onClose}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Code" hint="Vendors reference this in metrics[].code">
                    <input className={inputCls} value={form.code} disabled={Boolean(metric)} onChange={(e) => set("code", e.target.value)} />
                </Field>
                <Field label="Name">
                    <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Unit">
                    <input className={inputCls} value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="count, hours, kg…" />
                </Field>
                <Field label="Data type">
                    <select className={inputCls} value={form.dataType} onChange={(e) => set("dataType", e.target.value as MetricForm["dataType"])}>
                        <option value="number">number</option>
                        <option value="integer">integer</option>
                    </select>
                </Field>
                <Field label="Aggregation" hint="Only sum and latest feed summary totals">
                    <select className={inputCls} value={form.aggregation} onChange={(e) => set("aggregation", e.target.value as MetricForm["aggregation"])}>
                        {HUB_METRIC_AGGREGATIONS.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Default classification">
                    <select className={inputCls} value={form.defaultClassification} onChange={(e) => set("defaultClassification", e.target.value as MetricForm["defaultClassification"])}>
                        {HUB_METRIC_CLASSIFICATIONS.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Min value">
                    <input className={inputCls} inputMode="decimal" value={form.minValue} onChange={(e) => set("minValue", e.target.value)} />
                </Field>
                <Field label="Max value">
                    <input className={inputCls} inputMode="decimal" value={form.maxValue} onChange={(e) => set("maxValue", e.target.value)} />
                </Field>
                <Field label="Sector">
                    <input className={inputCls} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
                </Field>
                <Field label="SDGs" hint="Comma-separated numbers 1–17">
                    <input className={inputCls} value={form.sdgs} onChange={(e) => set("sdgs", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Methodology notes">
                        <textarea className={`${inputCls} min-h-[60px]`} value={form.methodologyNotes} onChange={(e) => set("methodologyNotes", e.target.value)} />
                    </Field>
                </div>
                <div className="sm:col-span-2">
                    <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Active" hint="Inactive metrics are rejected at processing time." />
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={onClose}>
                    Cancel
                </button>
                <button type="button" className={btnPrimary} disabled={busy} onClick={submit}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {metric ? "Save changes" : "Add metric"}
                </button>
            </div>
        </Modal>
    );
}
