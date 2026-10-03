import { authenticatedFetch } from "@/utils/api";
import { fetchImpactSummary } from "@/utils/cielImpactSummary";
import type { CielPathKey } from "@/utils/cielImpactSummary";
import { fetchStudentDashboardData } from "@/utils/student-dashboard-fetch";
import {
    fetchCommunityServiceRankings,
    prefetchCommunityServiceData,
    prefetchStudentBrowseOpportunities,
} from "@/utils/student-community-cache";
import {
    getPathSessionCache,
    pathSessionCacheAgeMs,
    setPathSessionCache,
} from "@/utils/student-path-session-cache";

const FRESH_MS = 20_000;
const inFlight = new Map<string, Promise<unknown>>();

async function cachedPath<T>(key: string, loader: () => Promise<T>): Promise<T | null> {
    const cached = getPathSessionCache<T>(key);
    if (cached && pathSessionCacheAgeMs(key) < FRESH_MS) return cached;
    const existing = inFlight.get(key);
    if (existing) return existing as Promise<T | null>;
    const pending = (async () => {
        try {
            const next = await loader();
            setPathSessionCache(key, next);
            return next;
        } finally {
            inFlight.delete(key);
        }
    })();
    inFlight.set(key, pending);
    return pending;
}

export function prefetchCourseProjects(): void {
    void cachedPath("course-projects", async () => {
        const res = await authenticatedFetch("/api/v1/paths/course-projects", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        return Array.isArray(json?.data) ? json.data : [];
    });
}

export function prefetchFypEntries(): void {
    void cachedPath("fyp-entries", async () => {
        const res = await authenticatedFetch("/api/v1/paths/fyp-theses", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        if (Array.isArray(json?.data)) return json.data;
        if (json?.data && typeof json.data === "object") return [json.data];
        return [];
    });
}

export function prefetchStartupVenture(): void {
    void cachedPath("startup-venture", async () => {
        const res = await authenticatedFetch("/api/v1/paths/startup-business", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        return json?.data ?? null;
    });
}

export function prefetchStudentPathData(key: CielPathKey): void {
    void fetchStudentDashboardData({ redirectToLogin: false });
    void fetchImpactSummary({ redirectToLogin: false });
    if (key === "communityService") {
        prefetchCommunityServiceData();
        void fetchCommunityServiceRankings().catch(() => undefined);
        prefetchStudentBrowseOpportunities();
        return;
    }
    if (key === "courseProject") {
        prefetchCourseProjects();
        return;
    }
    if (key === "fypThesis") {
        prefetchFypEntries();
        return;
    }
    prefetchStartupVenture();
}

export function prefetchStudentImpactPortfolio(): void {
    void fetchStudentDashboardData({ redirectToLogin: false });
    void fetchImpactSummary({ redirectToLogin: false });
    prefetchCommunityServiceData();
    prefetchCourseProjects();
    prefetchFypEntries();
    prefetchStartupVenture();
}
