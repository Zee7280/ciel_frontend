import { NextResponse } from "next/server";
import { proxyNestJson } from "../../../../_lib/nestProxy";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        return proxyNestJson(req, `admin/opportunities/${encodeURIComponent(id)}/directory-control`, {
            defaultErrorMessage: "Failed to update directory control",
        });
    } catch (error) {
        console.error("Directory control proxy error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
