import { useSyncExternalStore } from "react";
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

const IMPACT_FRESH_MS = 30_000;

let memoryCache: CielImpactSummary | null = null;
let memoryCachedAt = 0;
let inFlight: Promise<CielImpactSummary | null> | null = null;

export function peekImpactSummaryCache(): CielImpactSummary | null {
    if (memoryCache) return memoryCache;
    return readImpactSummaryCache();
}

export function readImpactSummaryCache(): CielImpactSummary | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CielImpactSummary;
        if (!memoryCache && parsed) {
            memoryCache = parsed;
            memoryCachedAt = Date.now();
        }
        return parsed;
    } catch {
        return null;
    }
}

function persistImpactSummaryCache(data: CielImpactSummary): void {
    memoryCache = data;
    memoryCachedAt = Date.now();
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(CIEL_IMPACT_SUMMARY_CACHE_EVENT));
    } catch {
        /* ignore quota / private mode */
    }
}

export function clearImpactSummaryCache(): void {
    memoryCache = null;
    memoryCachedAt = 0;
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(CACHE_KEY);
        window.dispatchEvent(new CustomEvent(CIEL_IMPACT_SUMMARY_CACHE_EVENT));
    } catch {
        /* ignore */
    }
}

function subscribeImpactSummaryCache(onStoreChange: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, onStoreChange);
    return () => window.removeEventListener(CIEL_IMPACT_SUMMARY_CACHE_EVENT, onStoreChange);
}

export function useImpactSummaryCache(): CielImpactSummary | null {
    return useSyncExternalStore(
        subscribeImpactSummaryCache,
        peekImpactSummaryCache,
        () => null,
    );
}

export async function fetchImpactSummary(config: { redirectToLogin?: boolean } = {}): Promise<CielImpactSummary | null> {
    const { redirectToLogin = true } = config;
    const cached = peekImpactSummaryCache();
    if (cached && memoryCachedAt && Date.now() - memoryCachedAt < IMPACT_FRESH_MS) {
        return cached;
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const res = await authenticatedFetch("/api/v1/students/impact/summary", {}, { redirectToLogin });
            if (res?.ok) {
                const result = await res.json().catch(() => null);
                if (result?.success && result.data) {
                    const data = result.data as CielImpactSummary;
                    persistImpactSummaryCache(data);
                    return data;
                }
            }
            return cached;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}
