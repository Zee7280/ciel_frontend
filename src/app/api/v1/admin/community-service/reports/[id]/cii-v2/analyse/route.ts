import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Analyzer waits on OpenAI + evidence. Keep this function alive for the Nest round-trip. */
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/community-service/reports/:id/cii-v2/analyse */
export async function POST(req: NextRequest, context: RouteContext) {
    const { id } = await context.params;
    return proxyToNest(
        req,
        `admin/community-service/reports/${encodeURIComponent(id)}/cii-v2/analyse`,
        { tryAlternatePaths: false },
    );
}
