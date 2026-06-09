import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

type RouteContext = { params: Promise<{ reportId: string }> };

/** Proxies Nest `PATCH /admin/reports/:id/ai-score`. */
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { reportId } = await context.params;
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.text();

        const response = await fetch(`${base}/admin/reports/${encodeURIComponent(reportId)}/ai-score`, {
            method: "PATCH",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: body || "{}",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to update AI score" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true });
    } catch (error) {
        console.error("admin/reports/[reportId]/ai-score PATCH proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
