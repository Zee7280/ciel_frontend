import { NextResponse } from "next/server";

function resolveBackendVerificationUrl(verificationKey: string): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/public/impact-reports/${encodeURIComponent(verificationKey)}/verification`;
}

/**
 * Public BFF: proxies to backend `GET /api/v1/public/impact-reports/:key/verification`.
 * Backend must return JSON only (no PII): e.g. `{ "success": true, "verified": true, "project_title": "...", "verified_at": "ISO-8601" }`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;
    const key = decodeURIComponent(projectId);
    if (!key) {
        return NextResponse.json({ success: false, verified: false, error: "missing_key" }, { status: 400 });
    }

    const targetUrl = resolveBackendVerificationUrl(key);
    if (!targetUrl) {
        return NextResponse.json(
            {
                success: false,
                verified: false,
                error: "backend_not_configured",
                message: "Verification service is not configured.",
            },
            { status: 503 },
        );
    }

    try {
        const response = await fetch(targetUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    verified: false,
                    error: response.status === 404 ? "not_found" : "upstream_error",
                    message:
                        typeof payload?.message === "string"
                            ? payload.message
                            : "This record could not be verified.",
                },
                { status: response.status === 404 ? 404 : 502 },
            );
        }

        return NextResponse.json(payload ?? { success: true, verified: false });
    } catch (e) {
        console.error("public impact-reports verification proxy:", e);
        return NextResponse.json(
            { success: false, verified: false, error: "upstream_unreachable", message: "Verification temporarily unavailable." },
            { status: 502 },
        );
    }
}
