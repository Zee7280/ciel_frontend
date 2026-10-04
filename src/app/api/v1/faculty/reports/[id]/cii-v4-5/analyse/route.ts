import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Analyzer waits on OpenAI + evidence. Keep this function alive for the Nest round-trip. */
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/faculty/reports/[id]/cii-v4-5/analyse
 * Proxies to Nest: POST /faculty/reports/:id/cii-v4-5/analyse
 * (This faculty route is a permanent 403 stub on the backend — faculty report review is
 * read-only everywhere. Kept for parity with the admin route's URL shape.)
 */
export async function POST(req: NextRequest, context: RouteContext) {
    const { id } = await context.params;
    return proxyToNest(
        req,
        `faculty/reports/${encodeURIComponent(id)}/cii-v4-5/analyse`,
        { tryAlternatePaths: false },
    );
}
