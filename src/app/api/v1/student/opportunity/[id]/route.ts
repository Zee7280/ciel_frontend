import { NextResponse } from "next/server";

function resolveBackendStudentOpportunitiesBase(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/student/opportunities`;
}

/** Student-owned opportunity updates (bypasses org-member check on generic PATCH /opportunities). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id?.trim()) {
            return NextResponse.json({ success: false, message: "Opportunity ID is required" }, { status: 400 });
        }

        const authHeader = request.headers.get("Authorization");
        const body = await request.text();

        const base = resolveBackendStudentOpportunitiesBase();
        if (!base) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const targetUrl = `${base}/${encodeURIComponent(id.trim())}`;

        const response = await fetch(targetUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
            body,
        });

        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const message =
            (typeof data.message === "string" && data.message) ||
            (Array.isArray(data.message) && String(data.message[0])) ||
            (typeof data.error === "string" && data.error) ||
            "Operation failed";

        if (!response.ok) {
            return NextResponse.json({ success: false, message, ...data }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in student/opportunity/[id] PATCH proxy:", error);
        return NextResponse.json(
            { success: false, message: "Could not reach the API server. Check your connection and backend URL." },
            { status: 502 },
        );
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    return PATCH(request, context);
}
