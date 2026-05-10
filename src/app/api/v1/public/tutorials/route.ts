import { NextResponse } from "next/server";

export const revalidate = 120;

function resolveBackendUrl(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/public/tutorials`;
}

/**
 * Public tutorial list for the marketing site (no JWT). Proxies Nest when configured.
 */
export async function GET() {
    const targetUrl = resolveBackendUrl();
    const empty = { success: true as const, data: [] };

    if (!targetUrl) {
        return NextResponse.json(empty);
    }

    try {
        const response = await fetch(targetUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            next: { revalidate: 120 },
        });
        const payload = (await response.json().catch(() => null)) as { success?: boolean; data?: unknown } | null;

        if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
            return NextResponse.json(empty);
        }

        return NextResponse.json({ success: true, data: payload.data });
    } catch (error) {
        console.error("public/tutorials proxy:", error);
        return NextResponse.json(empty);
    }
}
