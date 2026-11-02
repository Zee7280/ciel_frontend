"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/utils/api";

/** Live FYP / venture figures for a dashboard home card: what is waiting on a decision and what is approved. */
export type PathAreaCount = { pending: number; approved: number; total: number };
export type PathAreaCounts = { loading: boolean; fyp: PathAreaCount; venture: PathAreaCount };

const EMPTY: PathAreaCount = { pending: 0, approved: 0, total: 0 };

const ENDPOINTS = {
    faculty: { fyp: "/api/v1/paths/fyp-thesis/supervised", venture: "/api/v1/paths/startup-business/supervised" },
    university: { fyp: "/api/v1/paths/fyp-thesis/university", venture: "/api/v1/paths/startup-business/university" },
    admin: { fyp: "/api/v1/admin/paths/fyp-thesis", venture: "/api/v1/admin/paths/startup-business" },
} as const;

type Row = {
    status?: string;
    supervisorApprovalStatus?: string;
    reviewPipeline?: { supervisorStatus?: string } | null;
};

async function load(url: string): Promise<Row[]> {
    try {
        const res = await authenticatedFetch(url);
        if (!res?.ok) return [];
        const json = (await res.json()) as { data?: unknown };
        return Array.isArray(json.data) ? (json.data as Row[]) : [];
    } catch {
        return [];
    }
}

function count(rows: Row[], line: (r: Row) => string | undefined): PathAreaCount {
    const submitted = rows.filter((r) => (r.status || "submitted") === "submitted");
    const of = (s: string) => submitted.filter((r) => (line(r) || "pending") === s).length;
    return { pending: of("pending"), approved: of("approved"), total: submitted.length };
}

export function usePathAreaCounts(role: keyof typeof ENDPOINTS): PathAreaCounts {
    const [state, setState] = useState<PathAreaCounts>({ loading: true, fyp: EMPTY, venture: EMPTY });
    useEffect(() => {
        let cancelled = false;
        const urls = ENDPOINTS[role];
        Promise.all([load(urls.fyp), load(urls.venture)]).then(([fyp, venture]) => {
            if (cancelled) return;
            setState({
                loading: false,
                fyp: count(fyp, (r) => r.supervisorApprovalStatus),
                venture: count(venture, (r) => r.reviewPipeline?.supervisorStatus ?? undefined),
            });
        });
        return () => {
            cancelled = true;
        };
    }, [role]);
    return state;
}

/** Card badge text: "2 TO REVIEW · 5 APPROVED", or the static label while loading. */
export function pathAreaBadge(c: PathAreaCount, loading: boolean, fallback = "IMPACT AREA"): string {
    if (loading) return fallback;
    if (!c.total) return "NO SUBMISSIONS YET";
    return `${c.pending} TO REVIEW · ${c.approved} APPROVED`;
}
