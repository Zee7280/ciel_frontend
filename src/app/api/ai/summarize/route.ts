import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Vercel/Next — Section 11 audit can take several minutes with large reports. */
export const maxDuration = 300;

/** AI scoring/summary logic now lives in the NestJS backend (`/api/v1/ai/summarize`) so mobile clients can reuse it. */
export async function POST(req: NextRequest) {
    return proxyToNest(req, "ai/summarize", { tryAlternatePaths: false });
}
