import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

const EMPTY = { success: true as const, data: [] as unknown[] };

type OpportunitiesPayload = {
    success?: boolean;
    data?: unknown;
    apply_maintenance?: unknown;
    path_counts?: unknown;
    stats?: unknown;
};

/** Public live projects for homepage and marketing pages. Proxies Nest when configured. */
export async function GET() {
    const result = await fetchBackendPublicJson<OpportunitiesPayload>("opportunities", {
        logLabel: "public/opportunities",
    });

    // A failure (e.g. the API cold-starting past the proxy timeout) answers 503 with an empty list:
    // the home page widgets still render empty, and /projects falls back to the API directly.
    // Never cached, so the edge keeps serving the last good list.
    const unavailable = () => NextResponse.json(EMPTY, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (!result.ok) {
        return unavailable();
    }

    const payload = result.data;
    if (!payload?.success || !Array.isArray(payload.data)) {
        return unavailable();
    }

    // Anonymous, user-independent: let Vercel's edge serve repeat hits from the visitor's region.
    // The /projects page reads the maintenance banner and counts too, so pass them through.
    return NextResponse.json(
        {
            success: true,
            data: payload.data,
            apply_maintenance: payload.apply_maintenance,
            path_counts: payload.path_counts,
            stats: payload.stats,
        },
        { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
    );
}
