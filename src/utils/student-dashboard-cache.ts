import type { DashboardData } from "@/app/dashboard/student/types";

export const CIEL_STUDENT_DASHBOARD_CACHE_KEY = "ciel_student_dashboard_cache";

/** Dispatched when cached dashboard payload changes (login / logout). */
export const CIEL_STUDENT_DASHBOARD_CACHE_EVENT = "ciel_student_dashboard_cache_updated";

export function persistStudentDashboardCache(data: DashboardData): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CIEL_STUDENT_DASHBOARD_CACHE_KEY, JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(CIEL_STUDENT_DASHBOARD_CACHE_EVENT));
    } catch {
        /* ignore quota / private mode */
    }
}

export function readStudentDashboardCache(): DashboardData | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(CIEL_STUDENT_DASHBOARD_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DashboardData;
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearStudentDashboardCache(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(CIEL_STUDENT_DASHBOARD_CACHE_KEY);
        window.dispatchEvent(new CustomEvent(CIEL_STUDENT_DASHBOARD_CACHE_EVENT));
    } catch {
        /* ignore */
    }
}
