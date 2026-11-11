import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

type RouteContext = { params: Promise<{ reportId: string }> };

/** Proxies Nest `POST /admin/reports/:id/evidence/download` (Super Admin evidence ZIP). */
export async function POST(request: Request, context: RouteContext) {
    try {
        const { reportId } = await context.params;
        const id = reportId?.trim();
        if (!id) {
            return NextResponse.json({ error: "Report id is required" }, { status: 400 });
        }
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ error: "Backend URL is not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.text();
        const response = await fetch(`${base}/admin/reports/${encodeURIComponent(id)}/evidence/download`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: body || "{}",
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const message =
                (errBody as { message?: string }).message ||
                (errBody as { error?: string }).error ||
                "Failed to download evidence";
            return NextResponse.json({ error: message }, { status: response.status });
        }

        const headers: Record<string, string> = {
            "Content-Type": response.headers.get("Content-Type") || "application/zip",
            "Content-Disposition":
                response.headers.get("Content-Disposition") || `attachment; filename="report-${id.slice(0, 8)}-evidence.zip"`,
        };
        for (const name of ["X-Evidence-Skipped", "X-Evidence-Not-In-Record"]) {
            const value = response.headers.get(name);
            if (value) headers[name] = value;
        }
        return new NextResponse(response.body, { status: 200, headers });
    } catch (error) {
        console.error("report evidence download proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
