import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.json();

        // Check if ID is in the body
        if (!body.id) {
            return NextResponse.json({ error: "Opportunity ID is required" }, { status: 400 });
        }

        const backendUrl = `${process.env.NEXT_PUBLIC_APP_API_BASE_URL}/opportunities/${body.id}`;
        console.log("Proxying update request to:", backendUrl);
        console.log("Auth Header present:", !!authHeader);

        const response = await fetch(backendUrl, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": authHeader || ""
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Backend error during update:", response.status, data);
            return NextResponse.json(
                { error: data.message || "Operation failed", details: data },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error in opportunities/update proxy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
