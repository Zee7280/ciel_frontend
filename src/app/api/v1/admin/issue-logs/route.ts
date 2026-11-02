import { NextRequest, NextResponse } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Proxies Nest `GET /admin/issue-logs` (forwards query string for search/filters). */
export async function GET(request: Request) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        const incoming = new URL(request.url);
        const qs = incoming.searchParams.toString();
        const target = qs ? `${base}/admin/issue-logs?${qs}` : `${base}/admin/issue-logs`;
        const response = await fetch(target, {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("admin/issue-logs GET proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/** Proxies Nest `DELETE /admin/issue-logs` (bulk delete: ids / resolvedOnly / olderThanDays in the JSON body). */
export async function DELETE(req: NextRequest) {
    return proxyToNest(req, "admin/issue-logs", { tryAlternatePaths: false });
}
