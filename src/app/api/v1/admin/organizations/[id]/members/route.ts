import { NextResponse } from "next/server";

const backendBase = () => process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "") ?? "";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();
        const response = await fetch(`${backendBase()}/admin/organizations/${id}/members`, {
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
        console.error("organization members POST proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
