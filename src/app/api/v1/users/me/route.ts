import { NextResponse } from "next/server";

export async function GET(request: Request) {
    return proxyRequest(request, "GET");
}

export async function PATCH(request: Request) {
    return proxyRequest(request, "PATCH");
}

async function proxyRequest(request: Request, method: string) {
    try {
        const authHeader = request.headers.get("Authorization");
        const contentType = request.headers.get("Content-Type");

        const headers: HeadersInit = {
            "Authorization": authHeader || ""
        };

        if (contentType) {
            headers["Content-Type"] = contentType;
        }

        const body = method !== "GET" ? await request.arrayBuffer() : undefined;

        const response = await fetch(`${process.env.BACKEND_API_URL}/user/me`, {
            method: method,
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
        console.error(`Error in users/me ${method} proxy:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
