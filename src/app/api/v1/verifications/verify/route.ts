import { NextRequest, NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/**
 * Proxy: GET /api/v1/verifications/verify?token=…
 *
 * Backend emails should use the same public URL for faculty and partner magic links
 * (token encodes role). Align `VERIFICATION_EMAIL_LINK` / API base in MailService with this route
 * so the browser hits same-origin Next first, then this proxies to `{apiBase}/verifications/verify`.
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

        const apiBase = resolveBackendApiV1Base();
        if (!apiBase) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const backendUrl = `${apiBase}/verifications/verify?token=${encodeURIComponent(token)}`;

        console.log(`[Proxy] Verifying token at ${apiBase}/verifications/verify`);

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
