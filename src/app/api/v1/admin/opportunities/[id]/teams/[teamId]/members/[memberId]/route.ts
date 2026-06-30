import { NextResponse } from "next/server";
import { proxyNestJson } from "../../../../../../../_lib/nestProxy";

/**
 * Next: PATCH /api/v1/admin/opportunities/:opportunityId/teams/:teamId/members/:memberId
 * Backend: PATCH /admin/opportunities/:opportunityId/teams/:teamId/members/:memberId
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; teamId: string; memberId: string }> },
) {
    try {
        const { id, teamId, memberId } = await params;
        return proxyNestJson(
            request,
            `admin/opportunities/${encodeURIComponent(id)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
            { defaultErrorMessage: "Failed to update member" },
        );
    } catch (error) {
        console.error("admin team member PATCH proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Next: DELETE /api/v1/admin/opportunities/:opportunityId/teams/:teamId/members/:memberId
 * Backend: DELETE /admin/opportunities/:opportunityId/teams/:teamId/members/:memberId
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; teamId: string; memberId: string }> },
) {
    try {
        const { id, teamId, memberId } = await params;
        const basePath = `admin/opportunities/${encodeURIComponent(id)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`;
        const response = await proxyNestJson(request, basePath, {
            method: "DELETE",
            defaultErrorMessage: "Failed to remove member",
        });
        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }
        return response;
    } catch (error) {
        console.error("admin team member DELETE proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
