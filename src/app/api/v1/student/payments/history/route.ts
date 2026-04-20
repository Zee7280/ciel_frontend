import { NextResponse } from "next/server";

/** RFC-style 8-4-4-4-12 hex UUID (case-insensitive). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeJwtPayloadJson(token: string): Record<string, unknown> | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;
    try {
        const json = atob(b64);
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function jwtUserIdFromPayload(payload: Record<string, unknown>): string | null {
    const candidates = [payload.id, payload.userId, payload.sub];
    for (const c of candidates) {
        if (c != null && String(c).trim() !== "") return String(c).trim();
    }
    return null;
}

/** GET /api/v1/student/payments/history?studentId=<uuid> — proxy; studentId must match JWT subject id. */
export async function GET(request: Request) {
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/+$/, "");
        if (!backendBase) {
            return NextResponse.json({ success: false, message: "Backend URL is not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized: Missing Authorization header" },
                { status: 401 },
            );
        }

        const token = authHeader.slice("Bearer ".length).trim();
        const payload = token ? decodeJwtPayloadJson(token) : null;
        const jwtUserId = payload ? jwtUserIdFromPayload(payload) : null;
        if (!jwtUserId) {
            return NextResponse.json({ success: false, message: "Unauthorized: invalid token" }, { status: 401 });
        }

        const incoming = new URL(request.url);
        const studentIdRaw = incoming.searchParams.get("studentId");
        if (studentIdRaw == null || studentIdRaw.trim() === "") {
            return NextResponse.json(
                { success: false, message: "Query parameter studentId is required" },
                { status: 400 },
            );
        }
        const studentId = studentIdRaw.trim();
        if (!UUID_RE.test(studentId)) {
            return NextResponse.json({ success: false, message: "studentId must be a valid UUID" }, { status: 400 });
        }

        const same =
            studentId.toLowerCase() === jwtUserId.toLowerCase() ||
            studentId.replace(/-/g, "").toLowerCase() === jwtUserId.replace(/-/g, "").toLowerCase();
        if (!same) {
            return NextResponse.json(
                { success: false, message: "Forbidden: studentId does not match the authenticated user" },
                { status: 403 },
            );
        }

        const url = `${backendBase}/student/payments/history?studentId=${encodeURIComponent(studentId)}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to load payment history" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true, data: [] });
    } catch (error) {
        console.error("student/payments/history GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
