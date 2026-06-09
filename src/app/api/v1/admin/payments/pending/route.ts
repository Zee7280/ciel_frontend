import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Proxies Nest `GET /admin/payments/pending`. */
export async function GET(request: Request) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const response = await fetch(`${base}/admin/payments/pending`, {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to load pending payments" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true, data: [] });
    } catch (error) {
        console.error("admin/payments/pending GET proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
