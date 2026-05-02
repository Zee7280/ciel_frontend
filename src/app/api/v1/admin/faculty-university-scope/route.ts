import { NextResponse } from "next/server";

const backendBase = () => process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "") ?? "";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const response = await fetch(`${backendBase()}/admin/faculty-university-scope`, {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("faculty-university-scope GET proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();
        const response = await fetch(`${backendBase()}/admin/faculty-university-scope`, {
            method: "POST",
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("faculty-university-scope POST proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
