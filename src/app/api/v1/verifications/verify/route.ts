import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for verification link from emails.
 * Handles GET /api/v1/verifications/verify?token=...
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Verification token is missing" },
                { status: 400 }
            );
        }

        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/verifications/verify?token=${token}`;

        console.log(`[Proxy] Verifying token: ${token} at ${backendUrl}`);

        const response = await fetch(backendUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to verify project" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Verification proxy error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error during verification" },
            { status: 500 }
        );
    }
}
