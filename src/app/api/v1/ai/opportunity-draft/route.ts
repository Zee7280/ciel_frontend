import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Nest allows each OpenAI attempt 60s, with a retry and backoff — same budget as the other AI routes. */
export const maxDuration = 300;

/** Student "Generate & Auto-Fill" opportunity draft (`POST /api/v1/ai/opportunity-draft` on Nest). */
export async function POST(req: NextRequest) {
    return proxyToNest(req, "ai/opportunity-draft", { tryAlternatePaths: false });
}
