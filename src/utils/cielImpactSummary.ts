import { authenticatedFetch } from "@/utils/api";
import type { CIIBreakdownKey as CiiSectionBreakdownKey } from "@/app/dashboard/student/report/utils/ciiSectionWeights";

export type CielPathState = "not_started" | "active" | "complete";

export interface CielPathStatusEntry {
    state: CielPathState;
    needsAction: boolean;
    progress: number;
    detail: string;
}

export type CielPathKey = "communityService" | "courseProject" | "fypThesis" | "startupBusiness";

export interface CielImpactSummary {
    compositeScore: number;
    band: string;
    rubric: Partial<Record<CiiSectionBreakdownKey, number>>;
    verifiedHours: number;
    pendingHours: number;
    activeEngagements: number;
    pathsStatus: Record<CielPathKey, CielPathStatusEntry>;
}

const CACHE_KEY = "ciel_impact_summary_cache";
/** Dispatched when the cached impact summary changes, so Sidebar + dashboard stay in sync without a duplicate fetch. */
export const CIEL_IMPACT_SUMMARY_CACHE_EVENT = "ciel_impact_summary_cache_updated";

export function readImpactSummaryCache(): CielImpactSummary | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CielImpactSummary;
    } catch {
        return null;
    }
}

function persistImpactSummaryCache(data: CielImpactSummary): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(CIEL_IMPACT_SUMMARY_CACHE_EVENT));
    } catch {
        /* ignore quota / private mode */
    }
}

export function clearImpactSummaryCache(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(CACHE_KEY);
        window.dispatchEvent(new CustomEvent(CIEL_IMPACT_SUMMARY_CACHE_EVENT));
    } catch {
        /* ignore */
    }
}

export async function fetchImpactSummary(config: { redirectToLogin?: boolean } = {}): Promise<CielImpactSummary | null> {
    const { redirectToLogin = true } = config;
    const res = await authenticatedFetch("/api/v1/students/impact/summary", {}, { redirectToLogin });
    if (res?.ok) {
        const result = await res.json().catch(() => null);
        if (result?.success && result.data) {
            const data = result.data as CielImpactSummary;
            persistImpactSummaryCache(data);
            return data;
        }
    }
    return null;
}
