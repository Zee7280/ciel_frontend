import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();

        // Proxy to Real Backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/organizations/create`, {
            method: "POST",
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to create organization" }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Create Organization Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
