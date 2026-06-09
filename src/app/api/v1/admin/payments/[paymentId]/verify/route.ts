import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Proxies Nest `POST /admin/payments/:paymentId/verify`. */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ paymentId: string }> },
) {
    try {
        const { paymentId } = await params;
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.text();

        const response = await fetch(`${base}/admin/payments/${encodeURIComponent(paymentId)}/verify`, {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: body || "{}",
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: (data as { message?: string }).message || "Failed to verify payment" },
                { status: response.status },
            );
        }

        return NextResponse.json(typeof data === "object" && data !== null ? data : { success: true });
    } catch (error) {
        console.error("admin/payments verify POST proxy:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
