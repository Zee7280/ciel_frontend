import { NextResponse } from "next/server";
import { fetchBackendPublicJson } from "@/utils/publicBffProxyFetch";

export const dynamic = "force-dynamic";

type CityImpactStat = {
    id: string;
    name: string;
    province: string;
    lat: number;
    lon: number;
    peopleServing: number;
    peopleServed: number;
    verifiedHours: number;
    resourcesDeployedPkr: number;
    outOfPocketPkr: number;
    communityDividendPkr: number;
    verifiedReports: number;
    sdgs: number[];
    partners: string[];
};

type RecentActivityItem = {
    city: string | null;
    hours: number;
    beneficiaries: number;
    partnerName: string | null;
    verifiedAt: string;
};

type SdgProjectItem = {
    title: string;
    city: string | null;
    path: string;
    verifiedAt: string;
};

type SdgImpactStat = {
    number: number;
    projects: number;
    attributedHours: number;
    peopleServed: number;
    cities: number;
    items: SdgProjectItem[];
};

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
        verified_records?: number;
        people_reached?: number;
        people_serving?: number;
        report_verified_hours?: number;
        resources_deployed_pkr?: number;
        out_of_pocket_pkr?: number;
        community_dividend_pkr?: number;
        dividend_hourly_rate_pkr?: number;
        partner_organisations?: number;
        verified_projects_all_paths?: number;
        cities_live?: number;
        sdgs_touched_by_reports?: number;
        partners_come_back_pct?: number;
        cities?: CityImpactStat[];
        recent_activity?: RecentActivityItem[];
        sdgs?: SdgImpactStat[];
    };
};

const FALLBACK: PlatformStatsPayload = {
    success: true,
    data: {
        contributors: 0,
        impact_hours: null,
        impact_hours_label: "Launching Pilot",
        universities: 0,
        sdgs_impacted: 0,
        students_enrolled: 0,
        engagement_hours: 0,
        sdgs_covered: 0,
        active_projects: 0,
        avg_cii_score: 0,
        verified_records: 0,
        people_reached: 0,
        people_serving: 0,
        report_verified_hours: 0,
        resources_deployed_pkr: 0,
        out_of_pocket_pkr: 0,
        community_dividend_pkr: 0,
        dividend_hourly_rate_pkr: 192,
        partner_organisations: 0,
        verified_projects_all_paths: 0,
        cities_live: 0,
        sdgs_touched_by_reports: 0,
        partners_come_back_pct: 0,
        cities: [],
        recent_activity: [],
        sdgs: [],
    },
};

function normalizeCount(value: unknown, fallback: number, max?: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const normalized = Math.max(0, Math.floor(numeric));
    return typeof max === "number" ? Math.min(max, normalized) : normalized;
}

function normalizeCities(value: unknown): CityImpactStat[] {
    if (!Array.isArray(value)) return [];
    const out: CityImpactStat[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const c = raw as Record<string, unknown>;
        if (typeof c.id !== "string" || typeof c.name !== "string") continue;
        const lat = Number(c.lat);
        const lon = Number(c.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        out.push({
            id: c.id,
            name: c.name,
            province: typeof c.province === "string" ? c.province : "",
            lat,
            lon,
            peopleServing: normalizeCount(c.peopleServing, 0),
            peopleServed: normalizeCount(c.peopleServed, 0),
            verifiedHours: normalizeCount(c.verifiedHours, 0),
            resourcesDeployedPkr: normalizeCount(c.resourcesDeployedPkr, 0),
            outOfPocketPkr: normalizeCount(c.outOfPocketPkr, 0),
            communityDividendPkr: normalizeCount(c.communityDividendPkr, 0),
            verifiedReports: normalizeCount(c.verifiedReports, 0),
            sdgs: Array.isArray(c.sdgs) ? c.sdgs.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 17) : [],
            partners: Array.isArray(c.partners) ? c.partners.filter((p): p is string => typeof p === "string") : [],
        });
    }
    return out;
}

function normalizeRecentActivity(value: unknown): RecentActivityItem[] {
    if (!Array.isArray(value)) return [];
    const out: RecentActivityItem[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const a = raw as Record<string, unknown>;
        const verifiedAt = typeof a.verifiedAt === "string" ? a.verifiedAt : null;
        if (!verifiedAt) continue;
        out.push({
            city: typeof a.city === "string" ? a.city : null,
            hours: normalizeCount(a.hours, 0),
            beneficiaries: normalizeCount(a.beneficiaries, 0),
            partnerName: typeof a.partnerName === "string" ? a.partnerName : null,
            verifiedAt,
        });
    }
    return out;
}

function normalizeSdgs(value: unknown): SdgImpactStat[] {
    if (!Array.isArray(value)) return [];
    const out: SdgImpactStat[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const s = raw as Record<string, unknown>;
        const number = Number(s.number);
        if (!Number.isFinite(number) || number < 1 || number > 17) continue;
        const items: SdgProjectItem[] = Array.isArray(s.items)
            ? s.items
                  .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
                  .map((it) => ({
                      title: typeof it.title === "string" && it.title.trim() ? it.title.trim() : "Community Service record",
                      city: typeof it.city === "string" ? it.city : null,
                      path: typeof it.path === "string" && it.path.trim() ? it.path.trim() : "Community Service",
                      verifiedAt: typeof it.verifiedAt === "string" ? it.verifiedAt : "",
                  }))
            : [];
        out.push({
            number,
            projects: normalizeCount(s.projects, 0),
            attributedHours: normalizeCount(s.attributedHours, 0),
            peopleServed: normalizeCount(s.peopleServed, 0),
            cities: normalizeCount(s.cities, 0),
            items,
        });
    }
    return out;
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
            verified_records: normalizeCount(d.verified_records, FALLBACK.data.verified_records ?? 0),
            people_reached: normalizeCount(d.people_reached, FALLBACK.data.people_reached ?? 0),
            people_serving: normalizeCount(d.people_serving, FALLBACK.data.people_serving ?? 0),
            report_verified_hours: normalizeCount(d.report_verified_hours, FALLBACK.data.report_verified_hours ?? 0),
            resources_deployed_pkr: normalizeCount(d.resources_deployed_pkr, FALLBACK.data.resources_deployed_pkr ?? 0),
            out_of_pocket_pkr: normalizeCount(d.out_of_pocket_pkr, FALLBACK.data.out_of_pocket_pkr ?? 0),
            community_dividend_pkr: normalizeCount(d.community_dividend_pkr, FALLBACK.data.community_dividend_pkr ?? 0),
            dividend_hourly_rate_pkr: normalizeCount(d.dividend_hourly_rate_pkr, FALLBACK.data.dividend_hourly_rate_pkr ?? 192),
            partner_organisations: normalizeCount(d.partner_organisations, FALLBACK.data.partner_organisations ?? 0),
            verified_projects_all_paths: normalizeCount(d.verified_projects_all_paths, FALLBACK.data.verified_projects_all_paths ?? 0),
            cities_live: normalizeCount(d.cities_live, FALLBACK.data.cities_live ?? 0),
            sdgs_touched_by_reports: normalizeCount(d.sdgs_touched_by_reports, FALLBACK.data.sdgs_touched_by_reports ?? 0, 17),
            partners_come_back_pct: normalizeCount(d.partners_come_back_pct, FALLBACK.data.partners_come_back_pct ?? 0, 100),
            cities: normalizeCities(d.cities),
            recent_activity: normalizeRecentActivity(d.recent_activity),
            sdgs: normalizeSdgs(d.sdgs),
        },
    };

    return NextResponse.json(normalized);
}
