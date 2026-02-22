import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const contentType = request.headers.get("Content-Type");

        const headers: HeadersInit = {
            "Authorization": authHeader || ""
        };

        if (contentType) {
            headers["Content-Type"] = contentType;
        }

        const body = await request.arrayBuffer();

        // Proxy to backend user/update
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/user/update`, {
            method: "POST",
            headers: headers,
            body: body,
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
        console.error("Error in user/update proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
