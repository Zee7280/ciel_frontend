import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/community-service/opportunities/:id/reopen-reporting-window */
export async function POST(req: NextRequest, context: RouteContext) {
    const { id } = await context.params;
    return proxyToNest(
        req,
        `admin/community-service/opportunities/${encodeURIComponent(id)}/reopen-reporting-window`,
        { tryAlternatePaths: false },
    );
}
