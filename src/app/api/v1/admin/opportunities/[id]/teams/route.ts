import { NextResponse } from "next/server";

/**
 * Next: GET /api/v1/admin/opportunities/:opportunityId/teams
 * Backend: GET /admin/opportunities/:opportunityId/teams
 *
 * Intended response shape:
 * {
 *   success: true,
 *   summary?: { registered_teams, completed_reports, reports_available },
 *   data: [{ id, team_id?, team_name, lead_name, participation_mode?: 'team' | 'individual', report_status, report_available, members: [...] }]
 *   Individual rows may use synthetic ids like individual:<studentId>; team_name may reflect the participant name.
 * }
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
