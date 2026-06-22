import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

type RouteContext = { params: Promise<{ reportId: string }> };

/** Proxies Nest `PATCH /admin/reports/:id/verify`. */
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

        const body = await request.json().catch(() => ({}));
        const response = await fetch(`${base}/admin/reports/${encodeURIComponent(reportId)}/verify`, {
            method: "PATCH",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        (payload as { message?: string }).message ||
                        (payload as { error?: string }).error ||
                        "Failed to verify report",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof payload === "object" && payload !== null ? payload : { success: true });
    } catch (error) {
        console.error("admin/reports/[reportId]/verify PATCH proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
