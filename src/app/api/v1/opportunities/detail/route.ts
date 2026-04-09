import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;
        const token = request.headers.get("Authorization");

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Opportunity ID is required" },
                { status: 400 },
            );
        }

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/opportunities/detail`,
            {
                method: "POST",
                headers: {
                    Authorization: token || "",
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ id }),
            },
        );

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("Error in opportunity detail proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
