import { authenticatedFetch } from "@/utils/api";

/** Single-venture routes every backend version has. */
export const LEGACY_VENTURE_URL = "/api/v1/paths/startup-business";
/** Multi-venture routes (newer backend). */
export const VENTURES_URL = "/api/v1/paths/startup-ventures";
export const ventureUrl = (id: string) => `${VENTURES_URL}/${encodeURIComponent(id)}`;

/**
 * True only when the server has no such route at all — Nest's "Cannot POST /…" 404 from a backend
 * older than the multi-venture routes. A real "Venture not found" 404 is NOT a missing route.
 */
export async function isMissingRoute(res: Response | null | undefined): Promise<boolean> {
    if (!res || res.status !== 404) return false;
    const body = (await res.clone().json().catch(() => null)) as { message?: unknown } | null;
    return typeof body?.message === "string" && /^Cannot (GET|POST|PATCH|PUT|DELETE) \//.test(body.message);
}

/** The student's venture on the legacy single-venture route, or null when they have none. */
export async function fetchLegacyVenture(): Promise<(Record<string, unknown> & { id?: string }) | null> {
    const res = await authenticatedFetch(LEGACY_VENTURE_URL, {}, { redirectToLogin: true });
    if (!res?.ok) return null;
    const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown> & { id?: string } } | null;
    return json?.data ?? null;
}

export const SECOND_VENTURE_UNAVAILABLE =
    "Starting another venture needs the latest CIEL PK server update, which is not live yet. Your existing venture was not changed — please try again later.";

export const SERVER_UPDATE_NEEDED =
    "This option needs the latest CIEL PK server update, which is not live yet. Nothing was changed — please try again later.";
