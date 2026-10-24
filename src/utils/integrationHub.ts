import { authenticatedFetch } from "@/utils/api";
import { readErrorMessage } from "@/components/admin/useAbortableFetch";

/**
 * Shared types, constants and request helpers for the Integration Hub screens
 * (Super Admin console + organization External Records). Field names mirror the backend
 * entities in ciel_backend/src/integration-hub/entities.
 */

export const HUB_ADMIN_BASE = "/api/v1/admin/integrations";
export const HUB_ORG_BASE = "/api/v1/org/integrations";

export const HUB_EVENT_TYPES = [
    "activity.session",
    "impact.metric",
    "evidence.item",
    "activity.corrected",
    "activity.voided",
] as const;
export type HubEventType = (typeof HUB_EVENT_TYPES)[number];

export const HUB_PLATFORM_STATUSES = ["sandbox", "live", "suspended", "retired"] as const;
export const HUB_CONNECTION_STATUSES = ["proposed", "org_approved", "active", "suspended", "revoked"] as const;
export const HUB_EVENT_STATUSES = ["received", "processed", "deferred", "dead", "rejected"] as const;
export const HUB_RECORD_STATUSES = ["current", "superseded", "voided"] as const;
export const HUB_REVIEW_STATES = ["unreviewed", "reviewed", "disputed", "clarification_requested"] as const;
export const HUB_EVIDENCE_STATES = ["quarantined", "accepted", "rejected", "purged"] as const;
export const HUB_METRIC_AGGREGATIONS = ["sum", "average", "unique_count", "latest", "non_additive"] as const;
export const HUB_METRIC_CLASSIFICATIONS = ["observed", "self_reported", "estimated", "projected", "externally_verified"] as const;

export type HubPlatformSettings = {
    rate_limit_per_minute?: number;
    max_batch_size?: number;
    max_payload_bytes?: number;
    max_evidence_bytes?: number;
    evidence_mime_allowlist?: string[];
    retention_days?: number;
    log_retention_days?: number;
    failure_rate_alert_threshold?: number;
};

export type HubPlatform = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: (typeof HUB_PLATFORM_STATUSES)[number];
    integrationMode: "push" | "pull" | "file";
    approvedEventTypes: string[];
    settings: HubPlatformSettings;
    effectiveSettings?: Required<HubPlatformSettings>;
    technicalContact: Record<string, unknown> | null;
    agreementReference: string | null;
    liveAt: string | null;
    suspendedAt: string | null;
    suspensionReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export type HubCredential = {
    id: string;
    platformId: string;
    keyId: string;
    secretLast4: string;
    status: "active" | "revoked";
    label: string | null;
    expiresAt: string | null;
    lastUsedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
};

export type HubIssuedCredential = {
    id: string;
    keyId: string;
    secret: string;
    label: string | null;
    expiresAt: string | null;
};

export type HubConnection = {
    id: string;
    platformId: string;
    platform?: Pick<HubPlatform, "id" | "name" | "slug" | "status"> | null;
    organizationId: string;
    organizationName: string;
    status: (typeof HUB_CONNECTION_STATUSES)[number];
    purpose: string | null;
    scopes: string[];
    dpaReference: string | null;
    personalFieldsAllowed: boolean;
    orgEvidenceOpenAllowed: boolean;
    retentionDays: number | null;
    referralDomain: string | null;
    validFrom: string | null;
    validUntil: string | null;
    orgApprovedAt: string | null;
    authorizedAt: string | null;
    suspendedAt: string | null;
    statusReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export type HubEvent = {
    id: string;
    connectionId: string;
    platformId: string;
    sourceEventId: string;
    eventType: string;
    schemaVersion?: string;
    status: (typeof HUB_EVENT_STATUSES)[number];
    attempts: number;
    nextAttemptAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    credentialKeyId: string | null;
    payloadBytes: number | null;
    receivedAt: string;
    processedAt: string | null;
    envelope?: Record<string, unknown>;
};

export type HubMetricValue = { code: string; value: number; unit?: string; classification?: string; method?: string };

export type HubRecord = {
    id: string;
    connectionId: string;
    platformId: string;
    externalActivityId: string;
    activityType: string;
    title: string | null;
    occurredOn: string | null;
    payload: Record<string, unknown>;
    metrics: HubMetricValue[];
    attestation: Record<string, unknown> | null;
    version: number;
    status: (typeof HUB_RECORD_STATUSES)[number];
    supersededById: string | null;
    sourceEventId: string;
    reviewState: (typeof HUB_REVIEW_STATES)[number];
    reviewNote: string | null;
    reviewedAt: string | null;
    voidedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type HubRecordVersion = Pick<HubRecord, "id" | "version" | "status" | "createdAt" | "sourceEventId" | "reviewState">;

export type HubEvidence = {
    id: string;
    connectionId: string;
    platformId: string;
    recordId: string | null;
    uploadId: string;
    bucket: string;
    storageKey?: string;
    originalName: string | null;
    mimeType: string;
    sizeBytes: string | number | null;
    sha256: string | null;
    state: (typeof HUB_EVIDENCE_STATES)[number];
    visibility: "restricted" | "org_visible";
    ticketExpiresAt: string;
    acceptedAt: string | null;
    rejectionCode: string | null;
    createdAt: string;
};

export type HubMetric = {
    id: string;
    code: string;
    name: string;
    unit: string;
    dataType: "number" | "integer";
    aggregation: (typeof HUB_METRIC_AGGREGATIONS)[number];
    defaultClassification: (typeof HUB_METRIC_CLASSIFICATIONS)[number];
    minValue: string | null;
    maxValue: string | null;
    sector: string | null;
    sdgs: number[];
    methodologyNotes: string | null;
    platformFieldMappings: Record<string, string>;
    active: boolean;
    createdAt: string;
};

export type HubAudit = {
    id: string;
    actorType: string;
    actorId: string | null;
    actorLabel: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    connectionId: string | null;
    details: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
};

export type HubSummary = {
    id: string;
    connectionId: string;
    scopeKey: string;
    period: string;
    recordCount: number;
    metricTotals: Record<string, number>;
    updatedAt: string;
};

export type HubHealth = {
    generated_at: string;
    cached: boolean;
    last_24h: { received: number; processed: number; rejected: number; dead: number; deferred: number };
    queue: { pending: number; dead: number; oldest_pending_seconds: number | null };
    platforms: Array<{ platform_id: string; slug: string; name: string; status: string; received_24h: number; failed_24h: number }>;
    evidence: { accepted_objects: number; accepted_bytes: number; quarantined: number };
    totals: { platforms: number; active_connections: number; current_records: number };
    rate_limit_hits: number;
    configuration?: { secrets_key_configured: boolean; evidence_storage_configured: boolean; evidence_bucket: string | null };
};

export type HubListResponse<T> = { success: boolean; rows: T[]; total: number; page: number; limit: number };
export type HubDataResponse<T> = { success: boolean; data: T; message?: string };

export type HubRecordDetail = {
    record: HubRecord;
    versions: HubRecordVersion[];
    evidence: HubEvidence[];
    sourceEvent: Pick<HubEvent, "id" | "sourceEventId" | "eventType" | "receivedAt" | "processedAt" | "status"> | null;
};

export type HubOrgSearchRow = { id: string; name: string; orgType: string; verificationStatus: string };

/** Build a query string from a filter object, dropping empty values. */
export function hubQuery(params: Record<string, string | number | undefined | null>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (!s) continue;
        q.set(k, s);
    }
    const str = q.toString();
    return str ? `?${str}` : "";
}

/** JSON request through the same-origin BFF proxy; throws with a readable message on failure. */
export async function hubRequest<T>(
    path: string,
    init: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
    const res = await authenticatedFetch(
        path,
        {
            method: init.method ?? "GET",
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: init.signal,
        },
        { redirectToLogin: true },
    );
    if (!res) throw new Error("Not signed in");
    if (!res.ok) throw new Error(await readErrorMessage(res));
    return (await res.json()) as T;
}

export function formatBytes(value: string | number | null | undefined): string {
    const n = typeof value === "string" ? Number(value) : (value ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return "—";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
    return `${(seconds / 86400).toFixed(1)}d`;
}

export type HubTone = "green" | "amber" | "red" | "slate" | "blue" | "purple";

const TONES: Record<string, HubTone> = {
    // platform / connection
    sandbox: "blue",
    live: "green",
    active: "green",
    proposed: "amber",
    org_approved: "amber",
    suspended: "red",
    retired: "slate",
    revoked: "red",
    // events
    received: "blue",
    processed: "green",
    deferred: "amber",
    dead: "red",
    rejected: "red",
    duplicate: "slate",
    // records
    current: "green",
    superseded: "slate",
    voided: "red",
    // review
    unreviewed: "slate",
    reviewed: "green",
    disputed: "red",
    clarification_requested: "amber",
    // evidence
    quarantined: "amber",
    accepted: "green",
    purged: "slate",
    restricted: "purple",
    org_visible: "blue",
};

export function hubStatusTone(status: string | null | undefined): HubTone {
    return TONES[String(status ?? "").toLowerCase()] ?? "slate";
}

export function hubStatusLabel(status: string | null | undefined): string {
    const s = String(status ?? "").trim();
    if (!s) return "—";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortId(id: string | null | undefined, n = 8): string {
    return id ? `${id.slice(0, n)}…` : "—";
}
