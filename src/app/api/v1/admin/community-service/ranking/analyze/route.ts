import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Each call reads several packages with OpenAI; keep the function alive for the Nest round-trip. */
export const maxDuration = 300;

/** POST /api/v1/admin/community-service/ranking/analyze */
export async function POST(req: NextRequest) {
    return proxyToNest(req, "admin/community-service/ranking/analyze", { tryAlternatePaths: false });
}
