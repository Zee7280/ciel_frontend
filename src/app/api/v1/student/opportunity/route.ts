import { NextResponse } from "next/server";

function resolveBackendStudentCreateUrl(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/student/opportunity`;
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.text();

        const targetUrl = resolveBackendStudentCreateUrl();
        if (!targetUrl) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const response = await fetch(targetUrl, {
            method: "POST",
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
            return NextResponse.json(
                { success: false, message, ...data },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in student/opportunity POST proxy:", error);
        return NextResponse.json(
            { success: false, message: "Could not reach the API server. Check your connection and backend URL." },
            { status: 502 },
        );
    }
}
