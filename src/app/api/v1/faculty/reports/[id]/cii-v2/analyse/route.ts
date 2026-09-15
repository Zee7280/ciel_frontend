import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/faculty/reports/[id]/cii-v2/analyse
 * 
 * Proxies to backend: POST /faculty/reports/:id/cii-v2/analyse
 * 
 * Phase 1: Auto-trigger AI Analysis when report reaches faculty inbox.
 * This runs the CII v2 AI evaluation and persists the score snapshot.
 */
export async function POST(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }

        const authHeader = request.headers.get("Authorization");
        const response = await fetch(
            `${backendBase}/faculty/reports/${encodeURIComponent(id)}/cii-v2/analyse`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            },
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg =
                (payload as { message?: string }).message ||
                (payload as { error?: string }).error ||
                "AI analysis failed";
            return NextResponse.json({ success: false, message: msg }, { status: response.status });
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("faculty/reports/[id]/cii-v2/analyse POST proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
