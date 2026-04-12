import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json(
                { success: false, message: "Backend URL is not configured" },
                { status: 500 },
            );
        }

        const authHeader = request.headers.get("Authorization");
        const response = await fetch(`${backendBase}/partner/approvals/${encodeURIComponent(id)}/approve`, {
            method: "POST",
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: (data as { message?: string }).message || "Failed to approve",
                    ...((typeof data === "object" && data) || {}),
                },
                { status: response.status },
            );
        }

        return NextResponse.json(
            typeof data === "object" && data !== null && "success" in data
                ? data
                : { success: true, ...(typeof data === "object" ? data : {}) },
        );
    } catch (error) {
        console.error("partner/approvals approve proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
