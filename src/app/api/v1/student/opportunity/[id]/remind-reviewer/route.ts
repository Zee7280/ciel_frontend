import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/student/opportunity/:id/remind-reviewer
 * Explicit BFF route so the Under Approval "Email {reviewer}" button always hits Nest
 * (does not rely on the catch-all alone).
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
    const { id } = await ctx.params;
    const oppId = String(id || "").trim();
    if (!oppId) {
        return Response.json(
            { success: false, message: "Opportunity ID is required" },
            { status: 400 },
        );
    }
    return proxyToNest(
        req,
        `student/opportunity/${encodeURIComponent(oppId)}/remind-reviewer`,
    );
}
