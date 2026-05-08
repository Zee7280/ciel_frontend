/**
 * Normalizes a raw base URL so paths match Nest `api/v1` mounting.
 */
function normalizeToApiV1Base(raw: string): string {
    const base = raw.replace(/\/+$/, "");
    return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

/**
 * From `NEXT_PUBLIC_BACKEND_BASE_URL` only (typical BFF / server proxy target).
 */
export function resolveBackendApiV1Base(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    return normalizeToApiV1Base(raw);
}

/**
 * From `NEXT_PUBLIC_APP_API_BASE_URL` when the browser talks to the API through that base.
 */
export function resolveAppApiV1Base(): string | null {
    const raw = process.env.NEXT_PUBLIC_APP_API_BASE_URL?.trim();
    if (!raw) return null;
    return normalizeToApiV1Base(raw);
}

/**
 * Same URL selection as {@link authenticatedFetch}: app API base first, then backend env.
 * (JSON / small requests.)
 */
export function resolvePreferredApiV1Base(): string | null {
    return resolveAppApiV1Base() ?? resolveBackendApiV1Base();
}

/**
 * Browser → Nest `api/v1` base for **large multipart** (e.g. tutorial video).
 * Tries `NEXT_PUBLIC_APP_API_BASE_URL` then `NEXT_PUBLIC_BACKEND_BASE_URL` and uses the
 * first whose **origin is not** the current page (avoids Vercel ~4.5MB `FUNCTION_PAYLOAD_TOO_LARGE`
 * when the web app and API share the same host).
 */
export function resolveTutorialMultipartUploadApiV1Base(): string | null {
    const rawCandidates = [resolveAppApiV1Base(), resolveBackendApiV1Base()].filter(Boolean) as string[];
    const seen = new Set<string>();
    const candidates: string[] = [];
    for (const c of rawCandidates) {
        if (seen.has(c)) continue;
        seen.add(c);
        candidates.push(c);
    }
    if (candidates.length === 0) return null;
    if (typeof window === "undefined") return null;

    let pageOrigin: string;
    try {
        pageOrigin = window.location.origin;
    } catch {
        return null;
    }

    for (const b of candidates) {
        try {
            if (new URL(`${b}/`).origin !== pageOrigin) {
                return b;
            }
        } catch {
            continue;
        }
    }
    return null;
}
