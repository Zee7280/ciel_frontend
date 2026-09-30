import { NextRequest, NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/**
 * Proxy: POST JSON `{ "token": "…" }` → backend `/verifications/verify`.
 * Forwards `Authorization: Bearer …` when present (required once backend enforces auth).
 */
function buildForwardHeaders(req: NextRequest): Record<string, string> {
    const authHeader = req.headers.get("authorization");
    const forwardHeaders: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (authHeader?.startsWith("Bearer ")) {
        forwardHeaders.Authorization = authHeader;
    }
    return forwardHeaders;
}

/** GET never verifies — link prefetchers/mail scanners would otherwise auto-approve. Use POST. */
export async function GET() {
    return NextResponse.json(
        { success: false, message: "Use POST to submit a verification." },
        { status: 405, headers: { Allow: "POST" } },
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as { token?: unknown };
        const token = typeof body.token === "string" ? body.token.trim() : "";

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Verification token is missing" },
                { status: 400 },
            );
        }

        const apiBase = resolveBackendApiV1Base();
        if (!apiBase) {
            return NextResponse.json(
                { success: false, message: "Server misconfiguration: backend URL not set" },
                { status: 500 },
            );
        }

        const backendUrl = `${apiBase}/verifications/verify`;
        console.log(`[Proxy] Verifying token (POST) at ${apiBase}/verifications/verify`);

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: buildForwardHeaders(req),
            body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        (data as { message?: string }).message || "Failed to verify project",
                },
                { status: response.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Verification proxy error (POST):", error);
        return NextResponse.json(
            { success: false, message: "Internal server error during verification" },
            { status: 500 },
        );
    }
}
