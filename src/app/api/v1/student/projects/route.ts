import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const body = await request.text();
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }

        const backendUrl = `${backendBase.replace(/\/$/, "")}/student/projects`;

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
            body: body || "{}",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to fetch projects" },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in student/projects POST proxy:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch projects" },
            { status: 500 },
        );
    }
}
