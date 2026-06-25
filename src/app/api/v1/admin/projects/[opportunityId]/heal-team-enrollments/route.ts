import { NextResponse } from "next/server";

/** Proxies Nest `POST /admin/projects/:opportunityId/heal-team-enrollments`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
) {
    try {
        const { opportunityId } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");

        const response = await fetch(
            `${backendBase}/admin/projects/${encodeURIComponent(opportunityId)}/heal-team-enrollments`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            },
        );

        const payload = await response.json().catch(() => ({}));
        return NextResponse.json(payload, { status: response.status });
    } catch (error) {
        console.error("heal-team-enrollments proxy error:", error);
        return NextResponse.json({ success: false, message: "Failed to repair enrollments" }, { status: 500 });
    }
}
