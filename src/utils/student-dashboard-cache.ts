import { useSyncExternalStore } from "react";
import type { DashboardData } from "@/app/dashboard/student/types";

export const CIEL_STUDENT_DASHBOARD_CACHE_KEY = "ciel_student_dashboard_cache";

/** Dispatched when cached dashboard payload changes (login / logout / refresh). */
export const CIEL_STUDENT_DASHBOARD_CACHE_EVENT = "ciel_student_dashboard_cache_updated";

let memoryCache: DashboardData | null = null;
let memoryCachedAt = 0;

export function peekStudentDashboardCache(): DashboardData | null {
    if (memoryCache) return memoryCache;
    return readStudentDashboardCache();
}

export function studentDashboardCacheAgeMs(): number {
    return memoryCachedAt ? Date.now() - memoryCachedAt : Number.POSITIVE_INFINITY;
}

export function persistStudentDashboardCache(data: DashboardData): void {
    memoryCache = data;
    memoryCachedAt = Date.now();
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
        if (!memoryCache) {
            memoryCache = parsed;
            memoryCachedAt = Date.now();
        }
        return parsed;
    } catch {
        return null;
    }
}

export function clearStudentDashboardCache(): void {
    memoryCache = null;
    memoryCachedAt = 0;
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(CIEL_STUDENT_DASHBOARD_CACHE_KEY);
        window.dispatchEvent(new CustomEvent(CIEL_STUDENT_DASHBOARD_CACHE_EVENT));
    } catch {
        /* ignore */
    }
}

function subscribeStudentDashboardCache(onStoreChange: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(CIEL_STUDENT_DASHBOARD_CACHE_EVENT, onStoreChange);
    return () => window.removeEventListener(CIEL_STUDENT_DASHBOARD_CACHE_EVENT, onStoreChange);
}

/** Hydration-safe: server/first hydrate is null; client navigations read memory/localStorage immediately. */
export function useStudentDashboardCache(): DashboardData | null {
    return useSyncExternalStore(
        subscribeStudentDashboardCache,
        peekStudentDashboardCache,
        () => null,
    );
}
