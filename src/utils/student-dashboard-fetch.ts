import { authenticatedFetch } from "@/utils/api";
import type { DashboardData } from "@/app/dashboard/student/types";
import {
    persistStudentDashboardCache,
    peekStudentDashboardCache,
    studentDashboardCacheAgeMs,
} from "@/utils/student-dashboard-cache";

export {
    CIEL_STUDENT_DASHBOARD_CACHE_EVENT,
    CIEL_STUDENT_DASHBOARD_CACHE_KEY,
    clearStudentDashboardCache,
    persistStudentDashboardCache,
    peekStudentDashboardCache,
    readStudentDashboardCache,
    useStudentDashboardCache,
} from "@/utils/student-dashboard-cache";

const STUDENT_DASHBOARD_PATHS = [
    "/api/v1/students/me/dashboard",
] as const;

/** Skip a network round-trip when switching tabs within this window. */
const DASHBOARD_FRESH_MS = 30_000;

let inFlight: Promise<DashboardData | null> | null = null;

export async function fetchStudentDashboardData(config: { redirectToLogin?: boolean } = {}): Promise<DashboardData | null> {
    const { redirectToLogin = true } = config;
    const cached = peekStudentDashboardCache();
    if (cached && studentDashboardCacheAgeMs() < DASHBOARD_FRESH_MS) {
        return cached;
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            for (const path of STUDENT_DASHBOARD_PATHS) {
                const res = await authenticatedFetch(path, {}, { redirectToLogin });
                if (res?.ok) {
                    const result = await res.json().catch(() => null);
                    if (result?.success && result.data) {
                        const data = result.data as DashboardData;
                        persistStudentDashboardCache(data);
                        return data;
                    }
                }
            }
            return cached;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}
