import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }
        const authHeader = request.headers.get("Authorization");
        const bodyText = await request.text();
        const response = await fetch(`${backendBase}/api/v1/feedback/cep-experience`, {
            method: "POST",
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
            body: bodyText || "{}",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (data as { message?: string }).message || "Failed to submit feedback",
                    ...((typeof data === "object" && data) || {}),
                },
                { status: response.status },
            );
        }
        return NextResponse.json(
            typeof data === "object" && data !== null && "success" in data ? data : { success: true, ...data },
        );
    } catch (e) {
        console.error("feedback/cep-experience proxy:", e);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
