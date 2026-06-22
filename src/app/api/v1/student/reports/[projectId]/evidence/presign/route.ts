import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

type RouteCtx = { params: Promise<{ projectId: string }> };

/** JSON-only proxy for Section 8 / report evidence presign (file goes direct to S3). */
export async function POST(request: Request, ctx: RouteCtx) {
    try {
        const { projectId } = await ctx.params;
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }
        const authHeader = request.headers.get("Authorization");
        const bodyText = await request.text();
        const response = await fetch(
            `${base}/student/reports/${encodeURIComponent(projectId)}/evidence/presign`,
            {
                method: "POST",
                headers: {
                    Authorization: authHeader || "",
                    "Content-Type": "application/json",
                },
                body: bodyText || "{}",
            },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                typeof data === "object" && data !== null ? data : { success: false, message: "Presign failed" },
                { status: response.status },
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("student/reports/[projectId]/evidence/presign proxy:", e);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
