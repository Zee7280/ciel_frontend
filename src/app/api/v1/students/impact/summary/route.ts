import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Composite impact index + rubric + verified hours + per-path status, backing the sidebar and dashboard hero. */
export async function GET(req: NextRequest) {
    return proxyToNest(req, "students/impact/summary");
}
