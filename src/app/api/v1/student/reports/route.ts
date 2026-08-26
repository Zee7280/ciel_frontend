import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** GET /api/v1/student/reports — list the signed-in student's reports (badges + wall). */
export async function GET(req: NextRequest) {
    return proxyToNest(req, "student/reports");
}
