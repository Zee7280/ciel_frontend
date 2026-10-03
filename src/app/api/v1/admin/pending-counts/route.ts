import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Proxies Nest `GET /admin/pending-counts` (sidebar badge counts). */
export async function GET(req: NextRequest) {
    return proxyToNest(req, "admin/pending-counts", { tryAlternatePaths: false });
}
