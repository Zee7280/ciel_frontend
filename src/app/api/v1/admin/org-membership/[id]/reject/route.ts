import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const { id } = await params;
        const authHeader = request.headers.get("Authorization");
        const body = await request.json().catch(() => ({}));
        const response = await fetch(`${base}/admin/org-membership/${encodeURIComponent(id)}/reject`, {
            method: "POST",
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error("admin org-membership reject proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
