/**
 * Backend sends `impact_verify_url` (absolute https URL or path like `/impact/verify/<token>`).
 * QR must encode that URL only — do not build from slug/project_id or use NEXT_PUBLIC_BACKEND_BASE_URL.
 */

/** Absolute href for QR / links, or null if missing / invalid. */
export function resolveImpactVerifyQrHref(impactVerifyUrl: string | null | undefined): string | null {
    const raw = typeof impactVerifyUrl === "string" ? impactVerifyUrl.trim() : "";
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
    const base =
        envBase ||
        (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "");
    if (!base) return null;

    try {
        const path = raw.startsWith("/") ? raw : `/${raw}`;
        return new URL(path, base.endsWith("/") ? base : `${base}/`).href;
    } catch {
        return null;
    }
}

/**
 * Browser → backend public verification JSON (no PII). Uses NEXT_PUBLIC_BACKEND_BASE_URL only here.
 */
export function buildPublicImpactVerificationFetchUrl(verificationKey: string): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw || !verificationKey.trim()) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/public/impact-reports/${encodeURIComponent(verificationKey)}/verification`;
}

/** Nest / JSON may send snake_case or camelCase; normalize to a single trimmed string or null. */
export function pickImpactVerifyUrlFromPayload(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const o = payload as Record<string, unknown>;
    const snake = o.impact_verify_url;
    const camel = o.impactVerifyUrl;
    const raw =
        (typeof snake === "string" && snake.trim()) ||
        (typeof camel === "string" && camel.trim()) ||
        "";
    return raw || null;
}
