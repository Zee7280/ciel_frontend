import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.email || !body.otp) {
            return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
        const response = await fetch(`${backendUrl}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: body.email, otp: body.otp }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.message || "OTP verification failed" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
