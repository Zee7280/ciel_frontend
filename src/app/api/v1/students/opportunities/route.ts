import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Browse / filter student opportunities — proxies to Nest `GET|POST /students/opportunities`. */
export async function GET(req: NextRequest) {
    return proxyToNest(req, "students/opportunities");
}

export async function POST(req: NextRequest) {
    return proxyToNest(req, "students/opportunities");
}
