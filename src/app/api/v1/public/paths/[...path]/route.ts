import { NextResponse } from "next/server";
import { resolveBackendPublicUrl } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

/**
 * Public BFF: proxies `GET /api/v1/public/paths/*` (FYP / venture verification, home spotlight)
 * to the backend. Backend returns JSON only and never personal data on these routes.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const suffix = (path || []).map((p) => encodeURIComponent(decodeURIComponent(p))).join("/");
    if (!suffix) return NextResponse.json({ success: false, error: "missing_path" }, { status: 400 });
    const targetUrl = resolveBackendPublicUrl(`paths/${suffix}`);
    if (!targetUrl) {
        return NextResponse.json({ success: false, error: "backend_not_configured" }, { status: 503 });
    }
    try {
        const response = await fetch(targetUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return NextResponse.json(body, { status: response.status });
    } catch {
        return NextResponse.json({ success: false, error: "upstream_unreachable" }, { status: 502 });
    }
}
