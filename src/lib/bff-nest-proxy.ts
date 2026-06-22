import { NextRequest, NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Alternate Nest mount (`student` vs `students`) for legacy route aliases. */
function alternateNestPath(path: string): string | null {
    if (path.startsWith("student/")) {
        return `students/${path.slice("student/".length)}`;
    }
    if (path.startsWith("students/")) {
        return `student/${path.slice("students/".length)}`;
    }
    return null;
}

function nestPathsToTry(nestPath: string, tryAlternates: boolean): string[] {
    const primary = nestPath.replace(/^\/+/, "");
    const paths = [primary];
    if (tryAlternates) {
        const alt = alternateNestPath(primary);
        if (alt && alt !== primary) paths.push(alt);
    }
    return paths;
}

/** Avoid proxy loops when BACKEND_BASE_URL mistakenly points at the Next.js host. */
function backendWouldSelfLoop(req: NextRequest, apiBase: string): boolean {
    try {
        const backendOrigin = new URL(`${apiBase.replace(/\/+$/, "")}/`).origin;
        const forwarded = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
        const host = forwarded.split(",")[0]?.trim().toLowerCase();
        if (!host) return false;
        const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
        const requestOrigin = new URL(`${proto}://${host}/`).origin;
        return backendOrigin === requestOrigin;
    } catch {
        return false;
    }
}

async function passthroughResponse(upstream: Response): Promise<Response> {
    if (upstream.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const outHeaders = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) outHeaders.set("content-type", contentType);

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, { status: upstream.status, headers: outHeaders });
}

export type ProxyToNestOptions = {
    /** Retry with `student` ↔ `students` when Nest returns 404. Default true. */
    tryAlternatePaths?: boolean;
};

/**
 * Forward a Next.js BFF request to Nest `api/v1/{nestPath}`.
 * Used by the catch-all proxy and can be reused in bespoke route handlers.
 */
export async function proxyToNest(
    req: NextRequest,
    nestPath: string,
    options: ProxyToNestOptions = {},
): Promise<Response> {
    const base = resolveBackendApiV1Base();
    if (!base) {
        return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
    }

    if (backendWouldSelfLoop(req, base)) {
        return NextResponse.json(
            {
                success: false,
                message:
                    "NEXT_PUBLIC_BACKEND_BASE_URL points at the frontend host. Set it to the Nest API origin (e.g. cielbackend-*.vercel.app).",
            },
            { status: 500 },
        );
    }

    const tryAlternates = options.tryAlternatePaths !== false;
    const paths = nestPathsToTry(nestPath, tryAlternates);
    const search = req.nextUrl.search;

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

    let lastResponse: Response | null = null;

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const targetUrl = `${base}/${path}${search}`;

        try {
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers,
                ...(body !== undefined && body.byteLength > 0 ? { body } : {}),
            });

            const isLast = i === paths.length - 1;
            if (upstream.status !== 404 || isLast) {
                return passthroughResponse(upstream);
            }
            lastResponse = upstream;
        } catch (error) {
            console.error("bff-nest-proxy: upstream fetch failed:", targetUrl, error);
            return NextResponse.json({ success: false, message: "Upstream request failed" }, { status: 502 });
        }
    }

    return passthroughResponse(lastResponse ?? new Response(null, { status: 404 }));
}
