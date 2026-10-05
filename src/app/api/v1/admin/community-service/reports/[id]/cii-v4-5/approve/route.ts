import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/community-service/reports/:id/cii-v4-5/approve */
export async function POST(req: NextRequest, context: RouteContext) {
    const { id } = await context.params;
    return proxyToNest(
        req,
        `admin/community-service/reports/${encodeURIComponent(id)}/cii-v4-5/approve`,
        { tryAlternatePaths: false },
    );
}
