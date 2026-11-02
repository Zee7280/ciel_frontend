import { NextRequest, NextResponse } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const apiBase = resolveBackendApiV1Base();
        if (!apiBase) {
            return NextResponse.json({ success: false, message: "Server misconfiguration: backend URL not set" }, { status: 500 });
        }

        const response = await fetch(
            `${apiBase}/notifications/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to delete notification" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Delete notification error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/v1/notifications/:id — covers `read-all` (Nest `@Put('read-all')`), which this dynamic
 * segment captures before the catch-all proxy can; without a PUT export Next answered 405.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return proxyToNest(req, `notifications/${encodeURIComponent(id)}`, { tryAlternatePaths: false });
}
