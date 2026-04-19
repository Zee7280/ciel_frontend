import { NextResponse } from "next/server";

function backendBase(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
    return raw || null;
}

async function forwardToBackend(request: Request, method: "GET" | "POST") {
    const base = backendBase();
    if (!base) {
        return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    const url = `${base}/students/impact/history`;

    const headers: Record<string, string> = {
        Authorization: authHeader || "",
    };

    const init: RequestInit = { method, headers };

    if (method === "POST") {
        headers["Content-Type"] = "application/json";
        const text = await request.text();
        if (text) init.body = text;
    }

    const response = await fetch(url, init);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        return NextResponse.json(
            {
                success: false,
                message: (data as { message?: string }).message || "Failed to fetch impact history",
                ...data,
            },
            { status: response.status },
        );
    }

    return NextResponse.json(data);
}

/** Read-only impact archive; backend derives student from JWT. */
export async function GET(request: Request) {
    try {
        return await forwardToBackend(request, "GET");
    } catch (error) {
        console.error("students/impact/history GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

/** Legacy/alternate: body may include filters; forwarded as-is. */
export async function POST(request: Request) {
    try {
        return await forwardToBackend(request, "POST");
    } catch (error) {
        console.error("students/impact/history POST proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
