import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");

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

    } catch (error) {
        console.error("Error in user/me proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
