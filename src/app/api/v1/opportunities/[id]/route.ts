import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authHeader = request.headers.get("Authorization");
        const { id } = await params;

        const response = await fetch(`${process.env.BACKEND_API_URL}/opportunities/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            }
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
        console.error("Error in opportunities/[id] proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
