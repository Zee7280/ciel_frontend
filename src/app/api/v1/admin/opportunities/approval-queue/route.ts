import { NextResponse } from "next/server";

function extractQueueList(body: unknown): unknown[] {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") {
        const o = body as Record<string, unknown>;
        for (const k of ["data", "opportunities", "items", "results", "rows"] as const) {
            const v = o[k];
            if (Array.isArray(v)) return v;
        }
    }
    return [];
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }

        const { searchParams } = new URL(request.url);
        const queue = searchParams.get("queue") || "pending";
        const limit = searchParams.get("limit") || "500";
        const qs = new URLSearchParams({ queue, limit });

        const response = await fetch(`${backendBase}/admin/opportunities/approval-queue?${qs.toString()}`, {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (data as { message?: string }).message || "Failed to fetch opportunity approval queue",
                },
                { status: response.status },
            );
        }

        const list = extractQueueList(data);
        return NextResponse.json({ success: true, data: list, queue });
    } catch (error) {
        console.error("Approval queue proxy error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
