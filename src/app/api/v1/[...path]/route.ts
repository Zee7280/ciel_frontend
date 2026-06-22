import { NextRequest } from "next/server";
import { proxyToNest } from "@/lib/bff-nest-proxy";

/**
 * Catch-all BFF proxy: forwards any `/api/v1/*` request without a more specific
 * `route.ts` to Nest under the same path. Prevents 404 HTML when the UI calls
 * same-origin `/api/v1/...` on cielpk.com.
 *
 * More specific handlers (admin/dashboard, public routes, engagement catch-all)
 * take precedence over this file.
 */
type RouteCtx = { params: Promise<{ path: string[] }> };

async function delegate(req: NextRequest, ctx: RouteCtx): Promise<Response> {
    const { path } = await ctx.params;
    const segments = Array.isArray(path) ? path : [];
    const nestPath = segments.map((seg) => encodeURIComponent(seg)).join("/");
    return proxyToNest(req, nestPath);
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
    return delegate(req, ctx);
}
