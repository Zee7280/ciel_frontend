import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ error: "Backend URL is not configured" }, { status: 500 });
        }

        const incoming = new URL(request.url);
        const studentEmail = incoming.searchParams.get("student_email");
        const backendUrl = new URL(`${backendBase}/admin/projects`);
        if (studentEmail?.trim()) {
            backendUrl.searchParams.set("student_email", studentEmail.trim());
        }

        const response = await fetch(backendUrl.toString(), {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || "Failed to fetch projects" }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Projects Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
