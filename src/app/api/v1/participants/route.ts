import { NextRequest, NextResponse } from "next/server";

/** The backend roster endpoint is POST-only; GET is kept for older callers. */
async function forward(req: NextRequest, method: "GET" | "POST") {
    try {
        // Verify authentication
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // Forward to backend API
        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/participants`;
        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: method === "POST" ? await req.text() : "{}",
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to fetch participants" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Participants fetch error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return forward(req, "GET");
}

export async function POST(req: NextRequest) {
    return forward(req, "POST");
}
