import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/faculty/reports/[id]/cii-v2/approve
 *
 * Proxies to backend: POST /faculty/reports/:id/cii-v2/approve
 *
 * Phase 2: Faculty Override with Audit Trail
 * - Accepts optional facultyAdjustedScore
 * - Requires scoreAdjustmentReason when score differs from AI
 * - Stores audit trail: AI Recommended Score → Faculty Approved Score
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

        const body = await request.json().catch(() => ({}));
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(
            `${backendBase}/faculty/reports/${encodeURIComponent(id)}/cii-v2/approve`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
                body: JSON.stringify(body),
            },
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg =
                (payload as { message?: string }).message ||
                (payload as { error?: string }).error ||
                "Approval failed";
            return NextResponse.json({ success: false, message: msg }, { status: response.status });
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("faculty/reports/[id]/cii-v2/approve POST proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
