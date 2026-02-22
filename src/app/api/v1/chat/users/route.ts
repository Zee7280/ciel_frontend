import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/chat/users?search=${encodeURIComponent(search)}`;

        const response = await fetch(backendUrl, {
            method: "GET",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Search chat users error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
