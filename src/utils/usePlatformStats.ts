"use client";

import { useEffect, useState } from "react";

export type CityImpactStat = {
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

export type RecentActivityItem = {
    city: string | null;
    hours: number;
    beneficiaries: number;
    partnerName: string | null;
    verifiedAt: string;
};

export type SdgProjectItem = {
    title: string;
    city: string | null;
    path: string;
    verifiedAt: string;
};

export type SdgImpactStat = {
    number: number;
    projects: number;
    attributedHours: number;
    peopleServed: number;
    cities: number;
    items: SdgProjectItem[];
};

export type PlatformStats = {
    contributors: number;
    impact_hours: number | null;
    impact_hours_label: string | null;
    universities: number;
    sdgs_impacted: number;
    students_enrolled: number;
    engagement_hours: number;
    sdgs_covered: number;
    active_projects: number;
    avg_cii_score: number;
    verified_records: number;
    people_reached: number;
    people_serving: number;
    report_verified_hours: number;
    resources_deployed_pkr: number;
    out_of_pocket_pkr: number;
    community_dividend_pkr: number;
    dividend_hourly_rate_pkr: number;
    partner_organisations: number;
    verified_projects_all_paths: number;
    cities_live: number;
    sdgs_touched_by_reports: number;
    partners_come_back_pct: number;
    cities: CityImpactStat[];
    recent_activity: RecentActivityItem[];
    sdgs: SdgImpactStat[];
};

/** Fetches the real, backend-computed public impact ledger — same endpoint every homepage stats
 * section reads from, so the hero, the stats strip, and the map never disagree with each other. */
export function usePlatformStats() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/v1/public/platform-stats", { headers: { Accept: "application/json" }, cache: "no-store" })
            .then((res) => res.json())
            .then((payload) => {
                if (cancelled) return;
                if (payload?.data) setStats(payload.data as PlatformStats);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return { stats, loading };
}
