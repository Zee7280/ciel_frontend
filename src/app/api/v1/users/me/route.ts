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

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/users/me`, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: method !== "GET" ? await request.text() : undefined,
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
