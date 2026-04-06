import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        const response = await fetch(`${backendUrl}/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: body.email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "Failed to send OTP" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Send OTP error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
