import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** POST /api/v1/student/reports/:projectId/submit — JSON proxy to Nest submit. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const encoded = encodeURIComponent(projectId);
        const bodyText = await request.text();
        const headers = {
            Authorization: authHeader,
            "Content-Type": "application/json",
        };

        let response = await fetch(`${base}/student/reports/${encoded}/submit`, {
            method: "POST",
            headers,
            body: bodyText || "{}",
        });

        if (response.status === 404) {
            response = await fetch(`${base}/students/reports/${encoded}/submit`, {
                method: "POST",
                headers,
                body: bodyText || "{}",
            });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(payload, { status: response.status });
        }
        return NextResponse.json(payload);
    } catch (error) {
        console.error("student/reports/[projectId]/submit POST proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
