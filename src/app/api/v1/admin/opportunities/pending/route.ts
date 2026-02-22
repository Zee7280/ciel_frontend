import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.BACKEND_API_URL}/admin/opportunities/pending`, {
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to fetch pending opportunities" }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Pending Opportunities Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
