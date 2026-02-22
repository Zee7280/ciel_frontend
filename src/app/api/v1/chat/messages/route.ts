import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/chat/messages`;

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Send message error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
