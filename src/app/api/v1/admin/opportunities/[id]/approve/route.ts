import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");
        // Optional body ({ instructions }) — bulk approve sends none, so fall back to an empty object.
        const rawBody = await request.text().catch(() => "");

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/admin/opportunities/${id}/approve`, {
            method: "POST",
            headers: {
                "Authorization": authHeader || "",
                "Content-Type": "application/json"
            },
            body: rawBody.trim() ? rawBody : "{}",
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to approve opportunity" }, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Approve Opportunity Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
