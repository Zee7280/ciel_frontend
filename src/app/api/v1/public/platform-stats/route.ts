import { NextResponse } from "next/server";

export const revalidate = 300;

type PlatformStatsPayload = {
    success: true;
    data: {
        contributors: number;
        impact_hours: number | null;
        /** When `impact_hours` is null, optional marketing copy from backend */
        impact_hours_label?: string | null;
        universities: number;
        sdgs_impacted: number;
    };
};

const FALLBACK: PlatformStatsPayload = {
    success: true,
    data: {
        contributors: 50,
        impact_hours: null,
        impact_hours_label: "Launching Pilot",
        universities: 24,
        sdgs_impacted: 17,
    },
};

function resolveBackendStatsUrl(): string | null {
    const raw = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
    if (!raw) return null;
    const base = raw.replace(/\/+$/, "");
    const withV1 = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withV1}/public/platform-stats`;
}

/**
 * Public homepage stats. Proxies to backend when configured; otherwise returns safe defaults
 * so the UI never breaks during rollout.
 */
export async function GET() {
    const targetUrl = resolveBackendStatsUrl();
    if (!targetUrl) {
        return NextResponse.json(FALLBACK);
    }

    try {
        const response = await fetch(targetUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            next: { revalidate: 300 },
        });

        const payload = (await response.json().catch(() => null)) as PlatformStatsPayload | null;

        if (!response.ok || !payload?.success || !payload.data) {
            return NextResponse.json(FALLBACK);
        }

        const d = payload.data;
        const normalized: PlatformStatsPayload = {
            success: true,
            data: {
                contributors: Number.isFinite(d.contributors) ? Math.max(0, Math.floor(d.contributors)) : FALLBACK.data.contributors,
                impact_hours:
                    d.impact_hours == null || Number.isNaN(Number(d.impact_hours))
                        ? null
                        : Math.max(0, Math.floor(Number(d.impact_hours))),
                impact_hours_label:
                    typeof d.impact_hours_label === "string" && d.impact_hours_label.trim()
                        ? d.impact_hours_label.trim()
                        : FALLBACK.data.impact_hours_label,
                universities: Number.isFinite(d.universities) ? Math.max(0, Math.floor(d.universities)) : FALLBACK.data.universities,
                sdgs_impacted: Number.isFinite(d.sdgs_impacted)
                    ? Math.min(17, Math.max(0, Math.floor(d.sdgs_impacted)))
                    : FALLBACK.data.sdgs_impacted,
            },
        };

        return NextResponse.json(normalized);
    } catch (error) {
        console.error("public/platform-stats proxy:", error);
        return NextResponse.json(FALLBACK);
    }
}
