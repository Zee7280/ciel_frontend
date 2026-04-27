import { isPartnerRole } from "@/utils/profileCompletion";

export type DashboardNavRole = "student" | "partner" | "faculty" | "admin";

/**
 * Home URL under `/dashboard/*` for a stored API role.
 * Partner org types (ngo, corporate, university, etc.) all use `/dashboard/partner`, not `/dashboard/{role}`.
 */
export function getDashboardHomePathForRole(rawRole: unknown): string {
    const r = String(rawRole ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    if (!r) return "/dashboard/student";
    if (isPartnerRole(r)) return "/dashboard/partner";
    if (r === "admin" || r === "super_admin") return "/dashboard/admin";
    if (r === "faculty") return "/dashboard/faculty";
    if (r === "student") return "/dashboard/student";
    return "/dashboard/student";
}

/** Role segment implied by the URL (used before client reads `localStorage`). */
export function dashboardNavRoleFromPathname(pathname: string): DashboardNavRole {
    if (pathname.includes("/dashboard/admin")) return "admin";
    if (pathname.includes("/dashboard/partner")) return "partner";
    if (pathname.includes("/dashboard/faculty")) return "faculty";
    return "student";
}

/**
 * Prefer the signed-in user's role for dashboard chrome (sidebar / header).
 * Fixes admins opening e.g. `/dashboard/student/browse/:id` from admin tools
 * without switching the shell to the student layout.
 */
export function readDashboardNavRoleFromStorage(): DashboardNavRole | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
        if (!raw) return null;
        const u = JSON.parse(raw) as { role?: unknown };
        const role = String(u.role ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
        if (!role) return null;
        if (isPartnerRole(role)) return "partner";
        if (role === "admin" || role === "super_admin") return "admin";
        if (role === "faculty") return "faculty";
        return "student";
    } catch {
        return null;
    }
}
