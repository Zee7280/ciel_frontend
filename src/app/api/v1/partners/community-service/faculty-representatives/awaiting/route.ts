import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Static segment: without it `[facultyUserId]` (DELETE only) would answer this GET with 405. */
export async function GET(req: NextRequest) {
    return proxyToNest(req, "partners/community-service/faculty-representatives/awaiting");
}
