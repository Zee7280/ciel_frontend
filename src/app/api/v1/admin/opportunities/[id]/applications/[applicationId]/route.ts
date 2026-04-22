import { NextResponse } from "next/server";

/**
 * Next: DELETE /api/v1/admin/opportunities/:opportunityId/applications/:applicationId
 * Backend: DELETE /admin/opportunities/:opportunityId/applications/:applicationId
 *
 * Auth: same JwtAuthGuard as GET /admin/projects.
 * Server: one transaction — participations + student_reports + matching payments removed/archived,
 * then opportunity_application.withdrawn_at set (logical seat freed). Occupancy stays derived from
 * participation counts (no separate counter). GET /admin/projects, apply, and student withdraw are unchanged.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; applicationId: string }> },
) {
    try {
        const { id, applicationId } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const url = `${backendBase}/admin/opportunities/${encodeURIComponent(id)}/applications/${encodeURIComponent(applicationId)}`;

        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (payload as { message?: string; error?: string }).message
                        || (payload as { message?: string; error?: string }).error
                        || "Failed to remove applicant",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof payload === "object" && payload !== null ? payload : { success: true });
    } catch (error) {
        console.error("admin/opportunities/[id]/applications/[applicationId] DELETE proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
