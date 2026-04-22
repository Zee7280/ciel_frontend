import { NextResponse } from "next/server";

/**
 * Next: GET /api/v1/admin/opportunities/:opportunityId/incomplete-report-applicants
 * Backend: GET /admin/opportunities/:opportunityId/incomplete-report-applicants
 *
 * Auth: same JwtAuthGuard as GET /admin/projects (AdminController).
 * Response contract: { "data": [ { "application_id", "student_name", "student_email", "report_status" } ] }
 * (report_status is already public-mapped on the server.)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const url = `${backendBase}/admin/opportunities/${encodeURIComponent(id)}/incomplete-report-applicants`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (payload as { message?: string; error?: string }).message
                        || (payload as { message?: string; error?: string }).error
                        || "Failed to load applicants",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof payload === "object" && payload !== null ? payload : { success: true, data: [] });
    } catch (error) {
        console.error("admin/opportunities/[id]/incomplete-report-applicants GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
