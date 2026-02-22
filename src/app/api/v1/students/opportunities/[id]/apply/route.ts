import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authHeader = request.headers.get("Authorization");
        const { id } = await params;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            body = null;
        }

        // Proxy to backend /students/opportunities/[id]/apply
        const response = await fetch(`${process.env.BACKEND_API_URL}/students/opportunities/${id}/apply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: body ? JSON.stringify(body) : undefined
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
        console.error("Error in students/opportunities/[id]/apply proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
