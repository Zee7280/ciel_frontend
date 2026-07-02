import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

const EMPTY = { success: true as const, data: [] as unknown[] };

type OpportunitiesPayload = { success?: boolean; data?: unknown };

/** Public live projects for homepage and marketing pages. Proxies Nest when configured. */
export async function GET() {
    const result = await fetchBackendPublicJson<OpportunitiesPayload>("opportunities", {
        logLabel: "public/opportunities",
    });

    if (!result.ok) {
        return NextResponse.json(EMPTY);
    }

    const payload = result.data;
    if (!payload?.success || !Array.isArray(payload.data)) {
        return NextResponse.json(EMPTY);
    }

    return NextResponse.json({ success: true, data: payload.data });
}
