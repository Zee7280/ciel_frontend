import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/organizations/${id}`, {
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);
    } catch (error) {
        console.error("Organization detail proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/organizations/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": authHeader || ""
            }
        });

        if (response.status === 204) return new NextResponse(null, { status: 204 });

        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);
    } catch (error) {
        console.error("Organization delete proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
