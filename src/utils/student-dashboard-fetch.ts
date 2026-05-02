import { authenticatedFetch } from "@/utils/api";
import type { DashboardData } from "@/app/dashboard/student/types";

export {
    CIEL_STUDENT_DASHBOARD_CACHE_EVENT,
    CIEL_STUDENT_DASHBOARD_CACHE_KEY,
    clearStudentDashboardCache,
    persistStudentDashboardCache,
    readStudentDashboardCache,
} from "@/utils/student-dashboard-cache";

/** Prefer new JWT-scoped routes; fall back to legacy `/api/v1/student/dashboard`. */
const STUDENT_DASHBOARD_PATHS = [
    "/api/v1/students/me/dashboard",
    "/api/v1/student/me/dashboard",
    "/api/v1/student/dashboard",
] as const;

export async function fetchStudentDashboardData(config: { redirectToLogin?: boolean } = {}): Promise<DashboardData | null> {
    const { redirectToLogin = true } = config;
    for (const path of STUDENT_DASHBOARD_PATHS) {
        const res = await authenticatedFetch(path, {}, { redirectToLogin });
        if (res?.ok) {
            const result = await res.json().catch(() => null);
            if (result?.success && result.data) {
                return result.data as DashboardData;
            }
        }
    }
    return null;
}
