import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies `/api/v1/engagement/*` to Nest (`@Controller('engagement')`) under global prefix `api/v1`.
 * Some deployments expose Next BFF routes for `opportunities` but omit `engagement`, so browsers
 * calling `${sameOrigin}/api/v1/engagement/...` would 404 while opportunities still worked — breaking
 * partner/faculty attendance queues and PATCH approve.
 */
function requireBackendBase(): string | null {
    const base = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
    return base?.length ? base : null;
}

type RouteCtx = { params: Promise<{ path: string[] }> };

async function proxyToNest(req: NextRequest, pathSegments: string[]): Promise<Response> {
    const root = requireBackendBase();
    if (!root) {
        return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
    }

    const subPath = pathSegments.map((seg) => encodeURIComponent(seg)).join("/");
    const targetUrl = `${root}/engagement/${subPath}${req.nextUrl.search}`;

    const headers = new Headers();
    const authorization = req.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);
    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const accept = req.headers.get("accept");
    if (accept) headers.set("accept", accept);

    const method = req.method.toUpperCase();
    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
        body = await req.arrayBuffer();
    }

    let upstream: Response;
    try {
        upstream = await fetch(targetUrl, {
            method: req.method,
            headers,
            ...(body !== undefined && body.byteLength > 0 ? { body } : {}),
        });
    } catch (e) {
        console.error("engagement proxy: upstream fetch failed:", targetUrl, e);
        return NextResponse.json({ success: false, message: "Upstream request failed" }, { status: 502 });
    }

    const outHeaders = new Headers();
    const passCt = upstream.headers.get("content-type");
    if (passCt) outHeaders.set("content-type", passCt);

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
        status: upstream.status,
        headers: outHeaders,
    });
}

async function delegate(req: NextRequest, ctx: RouteCtx): Promise<Response> {
    const { path } = await ctx.params;
    return proxyToNest(req, Array.isArray(path) ? path : []);
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
