import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/chat/conversations/${id}/messages`;

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
        console.error("Fetch conversation messages error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
