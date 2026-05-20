import { NextResponse } from "next/server";

/**
 * Next: GET /api/v1/admin/opportunities/:opportunityId/teams
 * Backend: GET /admin/opportunities/:opportunityId/teams
 *
 * Backend returns (passthrough): { summary, data } — no wrapper required by the dashboard.
 * summary: registered_teams, completed_reports, reports_available; plus opportunity_snapshot fields:
 *   opportunity (snake_case: admin_approved, faculty_verification_status, awaiting_partner_or_faculty, …),
 *   applications_by_internal_status { pending_faculty, … }, applications_pipeline_total_non_withdrawn.
 * data: roster rows — members[].id includes enrollments (UUID) or pending synthetic pending:<applicationId>:m:<normalizedEmail>
 *   / lead pending row uses application UUID. Synthetic team ids remain individual:<studentId>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const response = await fetch(`${backendBase}/admin/opportunities/${encodeURIComponent(id)}/teams`, {
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
                    message:
                        (payload as { message?: string; error?: string }).message ||
                        (payload as { message?: string; error?: string }).error ||
                        "Failed to fetch teams",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(
            typeof payload === "object" && payload !== null
                ? payload
                : { success: true, summary: { registered_teams: 0, completed_reports: 0, reports_available: 0 }, data: [] },
        );
    } catch (error) {
        console.error("admin/opportunities/[id]/teams GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
