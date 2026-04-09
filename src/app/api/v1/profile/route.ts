import { NextResponse } from "next/server";

async function proxyToBackend(
    request: Request,
    method: "GET" | "PUT"
): Promise<NextResponse> {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized: Missing Authorization header" },
                { status: 401 }
            );
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        if (!backendUrl) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 }
            );
        }

        const init: RequestInit = {
            method,
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        };

        if (method === "PUT") {
            init.body = await request.text();
        }

        const response = await fetch(`${backendUrl.replace(/\/$/, "")}/profile`, init);

        const data: unknown = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                typeof data === "object" &&
                data !== null &&
                "message" in data &&
                typeof (data as { message: unknown }).message === "string"
                    ? (data as { message: string }).message
                    : "Profile request failed";
            return NextResponse.json({ success: false, message }, { status: response.status });
        }

        if (data && typeof data === "object" && "success" in data) {
            return NextResponse.json(data);
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error(`Error in profile ${method} proxy:`, error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    return proxyToBackend(request, "GET");
}

export async function PUT(request: Request) {
    return proxyToBackend(request, "PUT");
}
