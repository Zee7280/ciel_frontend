import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/opportunities/faculty/mine`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader || "",
                },
            },
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Failed to fetch opportunities" },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in opportunities/faculty/mine proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
