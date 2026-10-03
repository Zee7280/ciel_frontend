import { authenticatedFetch } from "@/utils/api";
import { getStoredCurrentUserId } from "@/utils/currentUser";
import {
    getPathSessionCache,
    pathSessionCacheAgeMs,
    setPathSessionCache,
} from "@/utils/student-path-session-cache";

export const STUDENT_OPPORTUNITY_MINE_CACHE_KEY = "student-opportunity-mine";
export const STUDENT_REPORTS_LIST_CACHE_KEY = "student-reports-list";
export const CS_RANKINGS_CACHE_KEY = "cs-rankings";
export const STUDENT_BROWSE_CACHE_KEY = "student-browse-opportunities";

export type StudentBrowsePayload = {
    success?: boolean;
    data?: unknown[];
    apply_maintenance?: { enabled?: boolean; message?: string };
};

const FRESH_MS = 20_000;

const inFlight = new Map<string, Promise<unknown>>();

async function cachedGet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: { force?: boolean },
): Promise<T | null> {
    if (!options?.force) {
        const cached = getPathSessionCache<T>(key);
        if (cached && pathSessionCacheAgeMs(key) < FRESH_MS) return cached;
        const existing = inFlight.get(key);
        if (existing) return existing as Promise<T | null>;
    }
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

export function peekStudentOpportunityMine(): Record<string, unknown>[] | null {
    return getPathSessionCache<Record<string, unknown>[]>(STUDENT_OPPORTUNITY_MINE_CACHE_KEY);
}

export async function fetchStudentOpportunityMine(): Promise<Record<string, unknown>[]> {
    const rows = await cachedGet<Record<string, unknown>[]>(STUDENT_OPPORTUNITY_MINE_CACHE_KEY, async () => {
        const res = await authenticatedFetch("/api/v1/student/opportunity/mine", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        return Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
    });
    return rows ?? peekStudentOpportunityMine() ?? [];
}

export function peekStudentReportsList(): Record<string, unknown>[] | null {
    return getPathSessionCache<Record<string, unknown>[]>(STUDENT_REPORTS_LIST_CACHE_KEY);
}

export async function fetchStudentReportsList(): Promise<Record<string, unknown>[]> {
    const rows = await cachedGet<Record<string, unknown>[]>(STUDENT_REPORTS_LIST_CACHE_KEY, async () => {
        const res = await authenticatedFetch("/api/v1/student/reports?limit=100", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        return Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
    });
    return rows ?? peekStudentReportsList() ?? [];
}

export function peekCommunityServiceRankings(): Record<string, unknown>[] | null {
    return getPathSessionCache<Record<string, unknown>[]>(CS_RANKINGS_CACHE_KEY);
}

export async function fetchCommunityServiceRankings(): Promise<Record<string, unknown>[] | null> {
    return cachedGet<Record<string, unknown>[]>(CS_RANKINGS_CACHE_KEY, async () => {
        const res = await authenticatedFetch("/api/v1/students/community-service/rankings", {}, { redirectToLogin: false });
        const json = res?.ok ? await res.json().catch(() => null) : null;
        if (!json?.success) throw new Error("rankings failed");
        return Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
    });
}

export function peekStudentBrowsePayload(): StudentBrowsePayload | null {
    return getPathSessionCache<StudentBrowsePayload>(STUDENT_BROWSE_CACHE_KEY);
}

export async function fetchStudentBrowsePayload(options?: { force?: boolean }): Promise<StudentBrowsePayload> {
    const payload = await cachedGet<StudentBrowsePayload>(
        STUDENT_BROWSE_CACHE_KEY,
        async () => {
            const userId = getStoredCurrentUserId() || null;
            const res = await authenticatedFetch(
                "/api/v1/students/opportunities",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: userId, page: 1, limit: 500 }),
                },
                { redirectToLogin: false },
            );
            const json = res?.ok ? await res.json().catch(() => null) : null;
            return (json ?? { success: false, data: [] }) as StudentBrowsePayload;
        },
        { force: options?.force },
    );
    return payload ?? peekStudentBrowsePayload() ?? { success: false, data: [] };
}

export function prefetchStudentBrowseOpportunities(): void {
    void fetchStudentBrowsePayload();
}

export function prefetchCommunityServiceData(): void {
    void fetchStudentOpportunityMine();
    void fetchStudentReportsList();
}
