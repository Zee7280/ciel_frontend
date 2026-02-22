import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");

        // Proxy to Real Backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/dashboard`, {
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to fetch dashboard stats" }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Dashboard Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
