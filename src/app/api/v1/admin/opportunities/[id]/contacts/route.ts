import { NextResponse } from "next/server";
import { proxyNestJson } from "../../../../_lib/nestProxy";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        return proxyNestJson(req, `admin/opportunities/${encodeURIComponent(id)}/contacts`, {
            defaultErrorMessage: "Failed to update project contacts",
        });
    } catch (error) {
        console.error("Project contacts proxy error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
