import { NextResponse } from "next/server";

/** POST /students/applications — alternate apply (body: { opportunityId, ... }). */
export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const body = await request.text();
        const response = await fetch(`${backendBase}/students/applications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader || "",
            },
            body: body || undefined,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Apply failed", ...data },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("students/applications POST proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
