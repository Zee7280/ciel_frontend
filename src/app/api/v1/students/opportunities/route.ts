import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "approved";

        // Proxy request to backend API
        // Append status to the backend URL
        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/students/opportunities?status=${status}`;

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            // Forward body if present, though for a filter it might be empty
            body: request.body ? request.body : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Operation failed" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in students/opportunities proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
