import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");

        // Proxy to Real Backend
        // Assuming the backend endpoint is /admin/organizations as per standard convention
        // If this 404s, we might need to check /admin/users or similar
        const response = await fetch(`${process.env.BACKEND_API_URL}/admin/organizations`, {
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to fetch organizations" }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Organizations Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
