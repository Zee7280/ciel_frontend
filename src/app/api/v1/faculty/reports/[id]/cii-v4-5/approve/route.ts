import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/faculty/reports/[id]/cii-v4-5/approve
 *
 * Proxies to backend: POST /faculty/reports/:id/cii-v4-5/approve
 * (This faculty route is now a permanent 403 stub on the backend — faculty report review is
 * read-only everywhere; only CIEL PK Admin can approve/lock CII v4.5. Kept as a thin pass-through:
 * body is forwarded verbatim, so no field-name changes are needed here even though v4.5 renamed
 * `facultyAdjustedScore`/`scoreAdjustmentReason` to `adminAdjustedScore`/`scoreModerationReason`
 * and dropped `criteriaOverrides` — the caller is responsible for the body shape.)
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
            `${backendBase}/faculty/reports/${encodeURIComponent(id)}/cii-v4-5/approve`,
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
        console.error("faculty/reports/[id]/cii-v4-5/approve POST proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
