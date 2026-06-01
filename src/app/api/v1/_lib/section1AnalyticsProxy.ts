import { NextResponse } from "next/server";
import { resolveBackendApiV1Base } from "@/utils/backendApiV1Base";

/** Shared GET proxy for Nest Section 1 analytics routes. */
export async function proxySection1AnalyticsGet(request: Request, nestPath: string) {
    try {
        const base = resolveBackendApiV1Base();
        if (!base) {
            return NextResponse.json({ success: false, message: "Backend URL not configured" }, { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        const incoming = new URL(request.url);
        const qs = incoming.searchParams.toString();
        const target = qs ? `${base}/${nestPath}?${qs}` : `${base}/${nestPath}`;
        const response = await fetch(target, {
            headers: {
                Authorization: authHeader || "",
                "Content-Type": "application/json",
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error(`section1 analytics GET proxy (${nestPath}):`, e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
