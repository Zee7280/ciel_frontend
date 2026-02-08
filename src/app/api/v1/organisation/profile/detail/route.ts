import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        const authHeader = request.headers.get("Authorization");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Proxy request to backend API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/organisation/profile/detail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Failed to fetch profile details" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in organisation/profile/detail proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
