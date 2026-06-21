import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

const EMPTY = { success: true as const, data: [] };

type TutorialsPayload = { success?: boolean; data?: unknown };

/** Public tutorial list for the marketing site (no JWT). Proxies Nest when configured. */
export async function GET() {
    const result = await fetchBackendPublicJson<TutorialsPayload>("tutorials", {
        logLabel: "public/tutorials",
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
