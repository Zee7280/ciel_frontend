import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ error: "Backend URL is not configured" }, { status: 500 });
        }

        const response = await fetch(`${backendBase}/admin/projects/evidence-overview`, {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { error: (data as { message?: string }).message || "Failed to load evidence overview" },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("evidence-overview proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
