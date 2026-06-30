import { NextResponse } from "next/server";
import { proxyNestJson } from "../../../../_lib/nestProxy";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        return proxyNestJson(req, `admin/opportunities/${encodeURIComponent(id)}/attendance-routing`, {
            defaultErrorMessage: "Failed to update attendance routing",
        });
    } catch (error) {
        console.error("Attendance routing proxy error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
