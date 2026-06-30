import { proxyNestJson } from "../../../../_lib/nestProxy";

/**
 * Next: GET /api/v1/admin/opportunities/:opportunityId/teams
 * Backend: GET /admin/opportunities/:opportunityId/teams
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        return proxyNestJson(request, `admin/opportunities/${encodeURIComponent(id)}/teams`, {
            defaultErrorMessage: "Failed to fetch teams",
        });
    } catch (error) {
        console.error("admin/opportunities/[id]/teams GET proxy:", error);
        return Response.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
