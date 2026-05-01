import { NextResponse } from "next/server";

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
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        const response = await fetch(
            `${backendBase}/admin/opportunities/${encodeURIComponent(id)}/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            },
        );

        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        (payload as { message?: string; error?: string }).message ||
                        (payload as { message?: string; error?: string }).error ||
                        "Failed to remove member",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof payload === "object" && payload !== null ? payload : { success: true });
    } catch (error) {
        console.error("admin/opportunities/[id]/teams/[teamId]/members/[memberId] DELETE proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
