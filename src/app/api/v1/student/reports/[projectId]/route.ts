import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** GET /api/v1/student/reports/:projectId — load report for student. */
export async function GET(
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
        const headers = {
            Authorization: authHeader,
            "Content-Type": "application/json",
        };

        let response = await fetch(`${base}/student/reports/${encoded}`, {
            method: "GET",
            headers,
        });

        if (response.status === 404) {
            response = await fetch(`${base}/students/reports/${encoded}`, {
                method: "GET",
                headers,
            });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(payload, { status: response.status });
        }
        return NextResponse.json(payload);
    } catch (error) {
        console.error("student/reports/[projectId] GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
