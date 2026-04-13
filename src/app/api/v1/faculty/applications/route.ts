import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "pending";
        const url = new URL(`${backendBase}/faculty/applications`);
        url.searchParams.set("status", status);

        const authHeader = request.headers.get("Authorization");
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (payload as { message?: string }).message || "Failed to load applications",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof payload === "object" && payload !== null ? payload : { success: true, data: [] });
    } catch (error) {
        console.error("faculty/applications GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
