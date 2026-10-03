import { authenticatedFetch } from "@/utils/api";

export const CIEL_ADMIN_MUTATED_EVENT = "ciel:admin-mutated";
export const CIEL_ADMIN_PENDING_COUNTS_EVENT = "ciel:admin-pending-counts";

export type AdminPendingCounts = {
    opportunityApprovals: number;
    userApprovals: number;
    joinApplications: number;
    payments: number;
    orgMembership: number;
    reportsAwaitingAdmin: number;
    issueLogsOpen: number;
    supportOpen: number;
};

export const EMPTY_ADMIN_PENDING_COUNTS: AdminPendingCounts = {
    opportunityApprovals: 0,
    userApprovals: 0,
    joinApplications: 0,
    payments: 0,
    orgMembership: 0,
    reportsAwaitingAdmin: 0,
    issueLogsOpen: 0,
    supportOpen: 0,
};

const TTL_MS = 30_000;
let cache: { at: number; token: string; data: AdminPendingCounts } | null = null;
let inFlight: Promise<AdminPendingCounts | null> | null = null;
let inFlightToken = "";

function currentToken(): string {
    try {
        return localStorage.getItem("ciel_token") || "";
    } catch {
        return "";
    }
}

function num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalize(raw: unknown): AdminPendingCounts {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const out = { ...EMPTY_ADMIN_PENDING_COUNTS };
    (Object.keys(out) as (keyof AdminPendingCounts)[]).forEach((k) => {
        out[k] = num(r[k]);
    });
    return out;
}

/** Last known counts (any age) for the current session, or null. Safe on the server. */
export function readAdminPendingCountsCache(): AdminPendingCounts | null {
    if (typeof window === "undefined") return null;
    return cache && cache.token === currentToken() ? cache.data : null;
}

/** Drop cached counts (logout / session change). */
export function clearAdminPendingCountsCache(): void {
    cache = null;
    inFlight = null;
    inFlightToken = "";
}

/**
 * Fetch admin pending-work counts. Cached for 30s, concurrent calls share one request.
 * Resolves to null on any failure (404, network, bad session) — callers treat that as "no data".
 */
export async function fetchAdminPendingCounts(opts: { force?: boolean } = {}): Promise<AdminPendingCounts | null> {
    if (typeof window === "undefined") return null;
    const token = currentToken();
    if (!token) return null;
    if (!opts.force && cache && cache.token === token && Date.now() - cache.at < TTL_MS) return cache.data;
    if (inFlight && inFlightToken === token) return inFlight;

    inFlightToken = token;
    const p: Promise<AdminPendingCounts | null> = (async (): Promise<AdminPendingCounts | null> => {
        try {
            const res = await authenticatedFetch("/api/v1/admin/pending-counts", {}, { redirectToLogin: false });
            if (!res || !res.ok) return null;
            const body = await res.json().catch(() => null);
            if (!body || body.success === false || !body.data) return null;
            const data = normalize(body.data);
            // Ignore the result if the session changed (logout) while we were waiting.
            if (currentToken() === token) {
                cache = { at: Date.now(), token, data };
                window.dispatchEvent(new CustomEvent(CIEL_ADMIN_PENDING_COUNTS_EVENT, { detail: data }));
            }
            return data;
        } catch {
            return null;
        } finally {
            queueMicrotask(() => {
                if (inFlight === p) inFlight = null;
            });
        }
    })();
    inFlight = p;
    return p;
}

/** Sum helper for the sidebar / dashboard. */
export function totalPending(c: AdminPendingCounts | null | undefined): number {
    if (!c) return 0;
    return Object.values(c).reduce((a, b) => a + b, 0);
}
