import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

type PlatformStatsPayload = {
    success: true;
    data: {
        contributors: number;
        impact_hours: number | null;
        impact_hours_label?: string | null;
        universities: number;
        sdgs_impacted: number;
        students_enrolled?: number;
        engagement_hours?: number;
        sdgs_covered?: number;
        active_projects?: number;
        avg_cii_score?: number;
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
        students_enrolled: 1200,
        engagement_hours: 18000,
        sdgs_covered: 10,
        active_projects: 85,
        avg_cii_score: 72,
    },
};

function normalizeCount(value: unknown, fallback: number, max?: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const normalized = Math.max(0, Math.floor(numeric));
    return typeof max === "number" ? Math.min(max, normalized) : normalized;
}

/** Public homepage stats. Proxies to backend when configured; otherwise returns safe defaults. */
export async function GET() {
    const result = await fetchBackendPublicJson<PlatformStatsPayload>("platform-stats", {
        logLabel: "public/platform-stats",
    });

    if (!result.ok || !result.data?.success || !result.data.data) {
        return NextResponse.json(FALLBACK);
    }

    const d = result.data.data;
    const normalized: PlatformStatsPayload = {
        success: true,
        data: {
            contributors: normalizeCount(d.contributors, FALLBACK.data.contributors),
            impact_hours:
                d.impact_hours == null || Number.isNaN(Number(d.impact_hours))
                    ? null
                    : Math.max(0, Math.floor(Number(d.impact_hours))),
            impact_hours_label:
                typeof d.impact_hours_label === "string" && d.impact_hours_label.trim()
                    ? d.impact_hours_label.trim()
                    : FALLBACK.data.impact_hours_label,
            universities: normalizeCount(d.universities, FALLBACK.data.universities),
            sdgs_impacted: normalizeCount(d.sdgs_impacted, FALLBACK.data.sdgs_impacted, 17),
            students_enrolled: normalizeCount(
                d.students_enrolled ?? d.contributors,
                FALLBACK.data.students_enrolled ?? FALLBACK.data.contributors,
            ),
            engagement_hours: normalizeCount(
                d.engagement_hours ?? d.impact_hours,
                FALLBACK.data.engagement_hours ?? 0,
            ),
            sdgs_covered: normalizeCount(d.sdgs_covered ?? d.sdgs_impacted, FALLBACK.data.sdgs_covered ?? 0, 17),
            active_projects: normalizeCount(d.active_projects, FALLBACK.data.active_projects ?? 0),
            avg_cii_score: normalizeCount(d.avg_cii_score, FALLBACK.data.avg_cii_score ?? 0, 100),
        },
    };

    return NextResponse.json(normalized);
}
