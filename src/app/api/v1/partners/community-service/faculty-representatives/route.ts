import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

async function proxy(request: Request, method: string, suffix = "") {
    const base = resolveBackendApiV1Base();
    if (!base) {
        return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
    }
    const authHeader = request.headers.get("Authorization");
    const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
    const response = await fetch(`${base}/partners/community-service/faculty-representatives${suffix}`, {
        method,
        headers: {
            Authorization: authHeader || "",
            "Content-Type": "application/json",
        },
        body: body || undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
}

export async function GET(request: Request) {
    try {
        return await proxy(request, "GET");
    } catch (e) {
        console.error("partners/community-service/faculty-representatives GET proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        return await proxy(request, "POST");
    } catch (e) {
        console.error("partners/community-service/faculty-representatives POST proxy:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
