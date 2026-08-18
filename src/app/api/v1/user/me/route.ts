import { NextRequest, NextResponse } from "next/server";

async function fetchCurrentUser(authHeader: string | null) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/user/me`, {
        method: "GET",
        headers: {
            "Authorization": authHeader || "",
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json(
            { success: false, message: data.message || "Failed to fetch user" },
            { status: response.status }
        );
    }

    return NextResponse.json({ success: true, data });
}

/** Read-only fetch of the current user — same proxy as POST below, for callers that don't need to send a body. */
export async function GET(request: NextRequest) {
    try {
        return await fetchCurrentUser(request.headers.get("Authorization"));
    } catch (error) {
        console.error("Error in user/me GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        return await fetchCurrentUser(request.headers.get("Authorization"));
    } catch (error) {
        console.error("Error in user/me proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
