import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/users/${id}`, {
            method: "POST",
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/users/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": authHeader || "",
            }
        });

        if (response.status === 204) return new NextResponse(null, { status: 204 });

        const data = await response.json();
        if (!response.ok) return NextResponse.json(data, { status: response.status });
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
