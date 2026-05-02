import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

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
        const response = await fetch(`${base}/organization-membership/fee`, {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("organization-membership fee proxy:", e);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
