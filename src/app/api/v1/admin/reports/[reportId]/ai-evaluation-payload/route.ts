import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

type RouteContext = { params: Promise<{ reportId: string }> };

/** Proxies Nest `GET /admin/reports/:id/ai-evaluation-payload`. */
export async function GET(request: Request, context: RouteContext) {
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

        const response = await fetch(
            `${base}/admin/reports/${encodeURIComponent(reportId)}/ai-evaluation-payload`,
            {
                method: "GET",
                headers: { Authorization: authHeader },
            },
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to load AI evaluation payload" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true });
    } catch (error) {
        console.error("admin/reports/[reportId]/ai-evaluation-payload GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
