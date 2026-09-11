import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/** Proxies nested Nest `admin/paths/startup-business/*` (spotlight PATCH, GET by id). */
type RouteCtx = { params: Promise<{ path: string[] }> };

async function delegate(req: NextRequest, ctx: RouteCtx): Promise<Response> {
    const { path } = await ctx.params;
    const segments = Array.isArray(path) ? path : [];
    const subPath = segments.map((seg) => encodeURIComponent(seg)).join("/");
    return proxyToNest(req, `admin/paths/startup-business/${subPath}`, { tryAlternatePaths: false });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}
