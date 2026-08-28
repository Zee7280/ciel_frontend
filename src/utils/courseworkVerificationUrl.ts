/** Browser → backend public coursework badge verification JSON (no PII). */
export function buildPublicCourseworkVerificationFetchUrl(verificationKey: string): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw || !verificationKey.trim()) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/public/coursework/${encodeURIComponent(verificationKey)}/verification`;
}
