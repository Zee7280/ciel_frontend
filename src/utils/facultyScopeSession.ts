/** Session hint so Faculty Hub header can show university delegation without an extra API call. */

export const CIEL_FACULTY_SCOPE_STORAGE_KEY = "ciel_faculty_university_scope_v1";
export const CIEL_FACULTY_SCOPE_EVENT = "ciel_faculty_scope_updated";
/** Persisted faculty dashboard slice: combined | personal | university */
export const CIEL_FACULTY_DASHBOARD_VIEW_KEY = "ciel_faculty_dashboard_view_v1";
export const CIEL_FACULTY_DASHBOARD_VIEW_EVENT = "ciel_faculty_dashboard_view_updated";

export type FacultyScopeSessionPayload = {
    organization_name: string;
    organization_id?: string;
};

export function writeFacultyScopeSession(payload: FacultyScopeSessionPayload | null): void {
    if (typeof window === "undefined") return;
    if (!payload?.organization_name) {
        sessionStorage.removeItem(CIEL_FACULTY_SCOPE_STORAGE_KEY);
    } else {
        sessionStorage.setItem(CIEL_FACULTY_SCOPE_STORAGE_KEY, JSON.stringify(payload));
    }
    window.dispatchEvent(new CustomEvent(CIEL_FACULTY_SCOPE_EVENT));
}

export function readFacultyScopeSession(): FacultyScopeSessionPayload | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(CIEL_FACULTY_SCOPE_STORAGE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as FacultyScopeSessionPayload;
        return p?.organization_name ? p : null;
    } catch {
        return null;
    }
}

export function clearFacultyScopeSession(): void {
    writeFacultyScopeSession(null);
    if (typeof window !== "undefined") {
        sessionStorage.removeItem(CIEL_FACULTY_DASHBOARD_VIEW_KEY);
    }
}

export type FacultyDashboardViewClient = "combined" | "personal" | "university";

export function readFacultyDashboardViewPreference(): FacultyDashboardViewClient {
    if (typeof window === "undefined") return "combined";
    const raw = sessionStorage.getItem(CIEL_FACULTY_DASHBOARD_VIEW_KEY);
    if (raw === "personal" || raw === "university" || raw === "combined") return raw;
    return "combined";
}

export function writeFacultyDashboardViewPreference(view: FacultyDashboardViewClient): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(CIEL_FACULTY_DASHBOARD_VIEW_KEY, view);
    window.dispatchEvent(new CustomEvent(CIEL_FACULTY_DASHBOARD_VIEW_EVENT));
}
