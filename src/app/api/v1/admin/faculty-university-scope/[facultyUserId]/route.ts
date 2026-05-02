import { NextResponse } from "next/server";

const backendBase = () => process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "") ?? "";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ facultyUserId: string }> },
) {
    try {
        const { facultyUserId } = await params;
        const authHeader = request.headers.get("Authorization");
        const response = await fetch(`${backendBase()}/admin/faculty-university-scope/${facultyUserId}`, {
            method: "DELETE",
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
        console.error("faculty-university-scope DELETE proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
