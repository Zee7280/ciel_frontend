/**
 * Normalizes NEXT_PUBLIC_BACKEND_BASE_URL so API paths match Nest `api/v1` mounting
 * (same pattern as student/opportunity proxy).
 */
export function resolveBackendApiV1Base(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}
