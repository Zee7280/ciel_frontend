import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.BACKEND_API_URL}/admin/users`, {
            method: "POST",
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");

        // Proxy to Real Backend
        const response = await fetch(`${process.env.BACKEND_API_URL}/admin/users`, {
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to fetch users" }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            data: data // Assuming backend returns array or { data: [] }
        });

    } catch (error) {
        console.error("Users Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
